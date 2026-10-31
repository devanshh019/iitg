import React, { useState, useEffect } from 'react';
import { Shield, Award, CheckCircle2, AlertTriangle, Eye, EyeOff, BarChart2, MessageSquare } from 'lucide-react';
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
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold font-mono text-white tracking-tight">Flight Review & Scoring</h1>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Rubric-weighted scoring with per-judge z-score normalization and outlier detection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={blindMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setBlindMode(!blindMode)}
            className="gap-2"
          >
            {blindMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>Blind Mode: {blindMode ? 'ON' : 'OFF'}</span>
          </Button>
        </div>
      </div>

      {/* Assigned Squads for Review */}
      {assignments.length > 0 && (
        <Card glow="cyan">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              <h3 className="font-mono font-bold text-sm text-slate-200 uppercase tracking-wider">
                My Flight Review Queue
              </h3>
            </div>
            <Badge variant="cyan">{assignments.length} SQUADS ASSIGNED</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignments.map((asgn, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  asgn.is_conflict
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : asgn.scores_submitted
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-space-950/60 border-space-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-white">{asgn.team_name}</span>
                    {asgn.is_conflict ? (
                      <Badge variant="rose" size="sm">CONFLICT</Badge>
                    ) : asgn.scores_submitted ? (
                      <Badge variant="emerald" size="sm">SCORED</Badge>
                    ) : (
                      <Badge variant="amber" size="sm">PENDING</Badge>
                    )}
                  </div>
                  {asgn.is_conflict ? (
                    <p className="text-xs text-rose-300 mt-1 font-mono">{asgn.conflict_reason}</p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Review live repo and recorded demo submission.</p>
                  )}
                </div>

                <div className="mt-4 pt-2 border-t border-space-850 flex justify-end">
                  {!asgn.is_conflict && (
                    <Button
                      variant={asgn.scores_submitted ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleOpenScoring(asgn)}
                      className="text-xs py-1"
                    >
                      {asgn.scores_submitted ? 'Revise Score' : 'Score Squad'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Flight Review Standings Leaderboard (Raw vs Normalized) */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-mono font-bold text-sm text-slate-200 uppercase tracking-wider">
              Telemetry Standings: Raw vs. Z-Score Normalized
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">{leaderboard.length} entries ranked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-space-950 border-b border-space-800 text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Squad</th>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4 text-center">Raw Avg (1-10)</th>
                <th className="py-3 px-4 text-center">Normalized (0-100)</th>
                <th className="py-3 px-4 text-center">Reviews</th>
                <th className="py-3 px-4 text-center">Outlier Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-space-850 text-slate-200">
              {leaderboard.map((row) => (
                <tr key={row.team_id} className="hover:bg-space-850/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`font-bold ${row.rank <= 3 ? 'text-amber-400 text-sm' : 'text-slate-400'}`}>
                      #{row.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">{row.team_name}</td>
                  <td className="py-3 px-4 text-cyan-400">{row.track || 'General'}</td>
                  <td className="py-3 px-4 text-center text-slate-300 font-bold">{row.raw_average.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center text-cyan-300 font-bold text-sm">
                    {row.normalized_score.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400">{row.review_count}</td>
                  <td className="py-3 px-4 text-center">
                    {row.outlier_flag ? (
                      <span className="text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500/40">
                        OUTLIER
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
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
              <div key={crit.id} className="p-3 bg-space-950 border border-space-800 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-mono font-bold text-white">{crit.name}</span>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
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
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>1.0 (Needs work)</span>
                  <span>5.0 (Prototype)</span>
                  <span>10.0 (Exceptional)</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">
              Flight Review Comment (Required on revision updates)
            </label>
            <textarea
              rows={3}
              placeholder="Provide constructive telemetry, feedback, or justification for score changes..."
              value={scoreComment}
              onChange={(e) => setScoreComment(e.target.value)}
              className="w-full bg-space-950 border border-space-800 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setScoringAssignment(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Submit Flight Review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
