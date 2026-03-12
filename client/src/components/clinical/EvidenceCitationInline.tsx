import { useState } from "react";
import { ExternalLink, BookOpen, Award } from "lucide-react";

interface ClinicalPaper {
  title: string;
  authors: string;
  journal: string;
  year: number;
  pmid: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'D';
  studyType: string;
  pubmedUrl: string;
}

interface EvidenceCitationInlineProps {
  papers: ClinicalPaper[];
  overallGrade?: 'A' | 'B' | 'C' | 'D';
  confidence?: string;
  source?: 'pubmed' | 'fallback';
  compact?: boolean;
}

const GRADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Strong' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Moderate' },
  C: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Limited' },
  D: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Insufficient' },
};

export default function EvidenceCitationInline({ papers, overallGrade, confidence, source, compact }: EvidenceCitationInlineProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredPaper, setHoveredPaper] = useState<number | null>(null);

  if (!papers || papers.length === 0) return null;

  const gradeStyle = overallGrade ? GRADE_STYLES[overallGrade] : GRADE_STYLES.D;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap mt-1">
        {overallGrade && (
          <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${gradeStyle.bg} ${gradeStyle.text}`}>
            <Award className="h-2.5 w-2.5" />
            Grade {overallGrade}
          </span>
        )}
        {papers.slice(0, 3).map((p, i) => (
          <a
            key={i}
            href={p.pubmedUrl || `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[9px] text-teal-400 hover:text-teal-300 underline decoration-dotted"
            title={p.title}
          >
            [{p.authors.split(',')[0].split(' ')[0]}, {p.year}]
          </a>
        ))}
        {papers.length > 3 && (
          <span className="text-[9px] text-gray-500">+{papers.length - 3} more</span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
      >
        <BookOpen className="h-4 w-4" />
        <span>PubMed Evidence ({papers.length} papers)</span>
        {overallGrade && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${gradeStyle.bg.replace('/20', '/10')} ${gradeStyle.text.replace('400', '700')}`}>
            Grade {overallGrade} — {gradeStyle.label}
          </span>
        )}
        {source === 'fallback' && (
          <span className="text-[10px] text-gray-400 italic">(cached)</span>
        )}
        <span className="text-xs text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {papers.map((paper, i) => {
            const pGrade = GRADE_STYLES[paper.evidenceGrade] || GRADE_STYLES.D;
            return (
              <div
                key={i}
                className="relative bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-sm"
                onMouseEnter={() => setHoveredPaper(i)}
                onMouseLeave={() => setHoveredPaper(null)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-xs leading-tight">{paper.title}</p>
                    <p className="text-[11px] text-gray-600 mt-1">
                      {paper.authors} — <span className="italic">{paper.journal}</span> ({paper.year})
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pGrade.bg.replace('/20', '/10')} ${pGrade.text.replace('400', '700')}`}>
                      {paper.evidenceGrade}
                    </span>
                    <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {paper.studyType}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <a
                    href={paper.pubmedUrl || `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <ExternalLink className="h-3 w-3" />
                    PMID: {paper.pmid}
                  </a>
                </div>
              </div>
            );
          })}

          {confidence && (
            <p className="text-[10px] text-gray-500 italic mt-1">
              Confidence: {confidence} | {papers.length} supporting studies
            </p>
          )}
        </div>
      )}
    </div>
  );
}
