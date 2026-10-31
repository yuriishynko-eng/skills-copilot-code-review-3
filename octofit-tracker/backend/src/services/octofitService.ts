import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

type HttpError = Error & { status: number };

function httpError(status: number, message: string): HttpError {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value);
}

// Activity type -> fitness focus used for workout suggestions.
const activityFocus: Record<string, string> = {
  run: 'endurance',
  cycle: 'endurance',
  walk: 'endurance',
  swim: 'endurance',
  strength: 'strength',
  weights: 'strength',
  yoga: 'mobility',
  stretch: 'mobility',
};

// Harder activity types earn a small bonus on top of one point per minute.
const pointMultiplier: Record<string, number> = { run: 1, cycle: 1, swim: 1.2, strength: 1.1, walk: 0.8, yoga: 0.9 };

export function calculatePoints(type: string, minutes: number) {
  return Math.max(1, Math.round(minutes * (pointMultiplier[type] ?? 1)));
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw httpError(400, 'Request body must be a JSON object');
  const { userId, teamId, type, minutes } = input;
  if (!isObjectId(userId)) throw httpError(400, 'userId must be a valid id');
  if (!isObjectId(teamId)) throw httpError(400, 'teamId must be a valid id');
  if (typeof type !== 'string' || type.trim().length === 0) throw httpError(400, 'type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) throw httpError(400, 'minutes must be a positive number');

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user) throw httpError(404, 'User not found');
  if (!team) throw httpError(404, 'Team not found');

  const activityType = type.trim().toLowerCase();
  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type: activityType,
    minutes,
    points: calculatePoints(activityType, minutes),
    occurredAt: new Date(),
  });
  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw httpError(400, 'Request body must be a JSON object');
  const { name, mascot, members = [] } = input;
  if (typeof name !== 'string' || name.trim().length === 0) throw httpError(400, 'name is required');
  if (typeof mascot !== 'string' || mascot.trim().length === 0) throw httpError(400, 'mascot is required');
  if (!Array.isArray(members) || !members.every(isObjectId)) throw httpError(400, 'members must be a list of valid user ids');

  const existingMembers = await User.countDocuments({ _id: { $in: members } });
  if (existingMembers !== new Set(members).size) throw httpError(400, 'All members must be existing users');

  const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members });
  return team.toObject();
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);
  const teams = await Team.find({ _id: { $in: totals.map((total) => total._id) } }).lean();
  const names = new Map(teams.map((team) => [team._id.toString(), team.name]));
  return totals
    .filter((total) => names.has(total._id.toString()))
    .map((total) => ({ teamId: total._id.toString(), teamName: names.get(total._id.toString()) as string, totalPoints: total.totalPoints }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.teamName.localeCompare(b.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw httpError(404, `No user found with email ${userEmail}`);

  // Count recent activity minutes per focus to find the user's pattern.
  const recent = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(20).lean();
  const minutesByFocus = new Map<string, number>();
  for (const activity of recent) {
    const focus = activityFocus[activity.type] ?? activity.type;
    minutesByFocus.set(focus, (minutesByFocus.get(focus) ?? 0) + activity.minutes);
  }
  const topActivityFocus = [...minutesByFocus.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const goal = user.fitnessGoal;

  const workouts = await Workout.find().lean();
  const score = (focus: string) => (focus === goal ? 2 : 0) + (focus === topActivityFocus ? 1 : 0);
  return workouts
    .map((workout) => {
      let reason = `A balanced ${workout.minutes}-minute ${workout.focus} workout to keep your activity varied.`;
      if (workout.focus === goal && workout.focus === topActivityFocus) {
        reason = `Matches your ${goal} goal and your recent ${workout.focus} activity.`;
      } else if (workout.focus === goal) {
        reason = `Supports your ${goal} fitness goal.`;
      } else if (workout.focus === topActivityFocus) {
        reason = `Builds on your recent ${workout.focus} activity.`;
      }
      return { ...workout, reason };
    })
    .sort((a, b) => score(b.focus) - score(a.focus) || a.minutes - b.minutes);
}

export { User };
