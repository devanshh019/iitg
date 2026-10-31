import React, { useState, useEffect } from 'react';
import { Shield, Award, CheckCircle2, AlertTriangle, Eye, EyeOff, BarChart2, Star } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { apiFetch } from '../api/client';

interface JudgingViewProps {
  eventId?: string;
}

export const JudgingView: React.FC<JudgingViewProps> = ({ eventId = 'apollo-24' }) => {
  const [missionId, setMissionId] = useState('');
  const [rubric, setRubric] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [blindMode, setBlindMode] = useState(false);
  const [scoringAssignment, setScoringAssignment] = useState<any>(null);

  // Score modal inputs: criterion_id -> score
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreComment, setScoreComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadJudgingData();
  }, [eventId, blindMode]);

  const loadJudgingData = async () => {
    try {
      setLoading(true);
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
      setMissionId(ev.id);

      const rub = await apiFetch(`/events/${ev.id}/judging/rubric`);
      setRubric(rub);

      const lb = await apiFetch(`/events/${ev.id}/judging/leaderboard?blind=${blindMode}`);
      setLeaderboard(lb);

      try {
        const asgns = await apiFetch(`/events/${ev.id}/judging/assignments`);
        setAssignments(asgns);
      } catch (e) {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScoring = (asgn: any) => {
    setScoringAssignment(asgn);
    setScoreComment('');
    const initialScores: Record<string, number> = {};
    rubric?.criteria?.forEach((c: any) => {
      initialScores[c.id] = 8.0;
    });
    setScores(initialScores);
  };

  const handleSubmitScores = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoringAssignment) return;
    try {
      setLoading(true);
      const payload = {
        scores: Object.entries(scores).map(([critId, val]) => ({
          criterion_id: critId,
          score: val,
          comment: scoreComment || 'Standard evaluation'
        }))
      };
      await apiFetch(`/events/${missionId}/judging/assignments/${scoringAssignment.assignment_id}/scores`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setScoringAssignment(null);
      loadJudgingData();
    } catch (err: any) {
      alert(err.message || 'Scoring submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 shadow-soft">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-maroon-700" />
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Judging Desk (Flight Review)</h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500">
            Score assigned teams with the rubric. Scores are normalized to balance strict and lenient judges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={blindMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setBlindMode(!blindMode)}
            className="gap-1.5 text-xs"
          >
            {blindMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>Blind Review: {blindMode ? 'ON' : 'OFF'}</span>
          </Button>
        </div>
      </div>

      {/* Assigned Squads for Review */}
      {assignments.length > 0 && (
        <Card className="bg-white rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-maroon-700" />
              <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                Teams Assigned to You
              </h3>
            </div>
            <Badge variant="maroon">{assignments.length} Teams to Review</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignments.map((asgn, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                  asgn.is_conflict
                    ? 'bg-rose-50/60 border-rose-200'
                    : asgn.scores_submitted
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-stone-50 border-stone-200/80 hover:border-maroon-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-stone-900">{asgn.team_name}</span>
                    {asgn.is_conflict ? (
                      <Badge variant="rose" size="sm">Conflict Flagged</Badge>
                    ) : asgn.scores_submitted ? (
                      <Badge variant="emerald" size="sm">Evaluated</Badge>
                    ) : (
                      <Badge variant="amber" size="sm">Needs Review</Badge>
                    )}
                  </div>
                  {asgn.is_conflict ? (
                    <p className="text-xs text-rose-700 mt-1">{asgn.conflict_reason}</p>
                  ) : (
                    <p className="text-xs text-stone-500 mt-1">Review live repo and demo presentation.</p>
                  )}
                </div>

                <div className="mt-4 pt-2.5 border-t border-stone-200/60 flex justify-end">
                  {!asgn.is_conflict && (
                    <Button
                      variant={asgn.scores_submitted ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleOpenScoring(asgn)}
                      className="text-xs py-1 px-3"
                    >
                      {asgn.scores_submitted ? 'Update Score' : 'Score Team'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Flight Review Standings Leaderboard */}
      <Card className="bg-white rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
              Official Leaderboard & Standings
            </h3>
          </div>
          <span className="text-xs text-stone-400 font-medium">{leaderboard.length} teams ranked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4 text-center">Raw Avg (1–10)</th>
                <th className="py-3 px-4 text-center font-bold text-maroon-800">Normalized (0–100)</th>
                <th className="py-3 px-4 text-center">Judges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {leaderboard.map((row) => (
                <tr key={row.team_id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`font-bold font-mono ${row.rank <= 3 ? 'text-maroon-700 text-sm' : 'text-stone-400'}`}>
                      #{row.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-stone-900">{row.team_name}</td>
                  <td className="py-3 px-4 text-stone-600">{row.track || 'General'}</td>
                  <td className="py-3 px-4 text-center text-stone-700 font-mono font-medium">{row.raw_average.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center text-maroon-800 font-mono font-bold text-sm">
                    {row.normalized_score.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-center text-stone-500 font-mono">{row.review_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Scoring Modal */}
      <Modal
        isOpen={!!scoringAssignment}
        onClose={() => setScoringAssignment(null)}
        title={`Reviewing: ${scoringAssignment?.team_name}`}
      >
        <form onSubmit={handleSubmitScores} className="space-y-4">
          <div className="space-y-4">
            {rubric?.criteria?.map((crit: any) => (
              <div key={crit.id} className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-stone-900">{crit.name}</span>
                  <span className="text-xs font-mono font-bold text-maroon-700">
                    Score: {scores[crit.id] || 8.0} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={scores[crit.id] || 8.0}
                  onChange={(e) => setScores({ ...scores, [crit.id]: parseFloat(e.target.value) })}
                  className="w-full accent-maroon-700 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                  <span>1.0 (Needs work)</span>
                  <span>5.0 (Average)</span>
                  <span>10.0 (Exceptional)</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1 uppercase tracking-wider">
              Feedback for the Team
            </label>
            <textarea
              rows={3}
              placeholder="What impressed you? What could be improved?"
              value={scoreComment}
              onChange={(e) => setScoreComment(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setScoringAssignment(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Submit Evaluation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
