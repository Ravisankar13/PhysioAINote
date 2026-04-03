export interface EvidenceReference {
  authors: string;
  year: number;
  title: string;
  journal: string;
  pmid?: string;
}

export interface TechniqueEvidence {
  name: string;
  type: 'exercise' | 'manual' | 'modality';
  dosage: string;
  rationale: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'Expert';
  references: EvidenceReference[];
  guidelineSource?: string;
}

export type ClinicalStatusKey = 'shortened' | 'overactive' | 'inhibited' | 'weak' | 'spasm' | 'lengthened' | 'normal';

export const SHARED_TECHNIQUE_DB: Record<ClinicalStatusKey, TechniqueEvidence[]> = {
  shortened: [
    {
      name: 'Sustained static stretch',
      type: 'exercise',
      dosage: '2-4 x 30-60s holds, 5-7 days/week',
      rationale: 'Restore resting length via viscoelastic creep and sarcomere remodeling',
      evidenceGrade: 'A',
      references: [
        { authors: 'Page P', year: 2012, title: 'Current concepts in muscle stretching for exercise and rehabilitation', journal: 'Int J Sports Phys Ther', pmid: '22319684' },
        { authors: 'Bandy WD, Irion JM, Briggler M', year: 1997, title: 'The effect of time and frequency of static stretching on flexibility of the hamstring muscles', journal: 'Phys Ther', pmid: '9256869' },
      ],
      guidelineSource: 'ACSM Guidelines 2021',
    },
    {
      name: 'Myofascial release (manual)',
      type: 'manual',
      dosage: '3-5 min per area, moderate pressure',
      rationale: 'Reduce fascial restrictions via thixotropic and neurophysiological mechanisms',
      evidenceGrade: 'B',
      references: [
        { authors: 'Ajimsha MS, Al-Mudahka NR, Al-Madzhar JA', year: 2015, title: 'Effectiveness of myofascial release: systematic review of randomized controlled trials', journal: 'J Bodyw Mov Ther', pmid: '25603749' },
      ],
      guidelineSource: 'JOSPT CPG 2017',
    },
    {
      name: 'Eccentric loading program',
      type: 'exercise',
      dosage: '3 x 12 reps, slow 4s eccentric phase, 3x/week',
      rationale: 'Promote sarcomere addition in series and restore optimal length-tension relationship',
      evidenceGrade: 'A',
      references: [
        { authors: "O'Sullivan K, McAuliffe S, DeBurca N", year: 2012, title: 'The effects of eccentric training on lower limb flexibility', journal: 'Br J Sports Med', pmid: '22267572' },
        { authors: 'Alfredson H, Pietila T, Jonsson P, Lorentzon R', year: 1998, title: 'Heavy-load eccentric calf muscle training for treatment of chronic Achilles tendinosis', journal: 'Am J Sports Med', pmid: '9617396' },
      ],
    },
    {
      name: 'Contract-relax PNF stretching',
      type: 'exercise',
      dosage: '3-5 reps: 6s isometric contraction then 30s stretch',
      rationale: 'Utilize autogenic inhibition via Golgi tendon organ for greater ROM gains',
      evidenceGrade: 'A',
      references: [
        { authors: 'Sharman MJ, Cresswell AG, Riek S', year: 2006, title: 'Proprioceptive neuromuscular facilitation stretching: mechanisms and clinical implications', journal: 'Sports Med', pmid: '16573356' },
      ],
    },
    {
      name: 'Instrument-assisted soft tissue mobilization',
      type: 'manual',
      dosage: '3-5 min per region, moderate intensity',
      rationale: 'Mechanical breakdown of collagen cross-links and stimulation of fibroblast activity',
      evidenceGrade: 'B',
      references: [
        { authors: 'Cheatham SW, Lee M, Cain M, Baker R', year: 2016, title: 'The efficacy of instrument assisted soft tissue mobilization: a systematic review', journal: 'J Can Chiropr Assoc', pmid: '27069265' },
      ],
    },
  ],
  overactive: [
    {
      name: 'Inhibitory trigger point pressure release',
      type: 'manual',
      dosage: '60-90s sustained pressure per point, 3-5 points',
      rationale: 'Reduce motor neuron excitability via autogenic inhibition and local ischemic compression',
      evidenceGrade: 'B',
      references: [
        { authors: 'Cagnie B, Castelein B, Pollie F, Steelant L, Verhoeyen H, Cools A', year: 2015, title: 'Evidence for the use of ischemic compression and dry needling in the management of trigger points', journal: 'J Manipulative Physiol Ther', pmid: '26547763' },
      ],
    },
    {
      name: 'Reciprocal inhibition exercise',
      type: 'exercise',
      dosage: '3 x 15 reps antagonist activation, 2s hold',
      rationale: "Sherrington's law of reciprocal inhibition - antagonist activation reflexively inhibits overactive agonist",
      evidenceGrade: 'B',
      references: [
        { authors: 'Crone C', year: 1993, title: 'Reciprocal inhibition in man', journal: 'Dan Med Bull', pmid: '8222755' },
      ],
    },
    {
      name: 'Foam rolling / self-myofascial release',
      type: 'exercise',
      dosage: '2-3 min per region, slow rolling at 1 inch/sec',
      rationale: 'Mechanical reduction of tone via autogenic inhibition and increased parasympathetic activity',
      evidenceGrade: 'A',
      references: [
        { authors: 'Beardsley C, Skarabot J', year: 2015, title: 'Effects of self-myofascial release: a systematic review', journal: 'J Bodyw Mov Ther', pmid: '26592226' },
      ],
    },
    {
      name: 'Dry needling',
      type: 'manual',
      dosage: '2-3 insertions per trigger point, elicit LTR',
      rationale: 'Elicit local twitch response to reset motor end plate dysfunction and reduce spontaneous electrical activity',
      evidenceGrade: 'A',
      references: [
        { authors: 'Gattie E, Cleland JA, Snodgrass S', year: 2017, title: 'The effectiveness of trigger point dry needling for musculoskeletal conditions', journal: 'J Orthop Sports Phys Ther', pmid: '28622488' },
      ],
      guidelineSource: 'APTA CPG 2013',
    },
  ],
  inhibited: [
    {
      name: 'Isolated isometric activation',
      type: 'exercise',
      dosage: '3 x 10s holds x 10 reps, submaximal effort progressing to maximal',
      rationale: 'Re-establish motor recruitment patterns via low-threshold motor unit activation',
      evidenceGrade: 'B',
      references: [
        { authors: 'Jull GA, Falla D, Vicenzino B, Hodges PW', year: 2009, title: 'The effect of therapeutic exercise on activation of the deep cervical flexor muscles', journal: 'Man Ther', pmid: '18793867' },
      ],
    },
    {
      name: 'Neuromuscular electrical stimulation (NMES)',
      type: 'modality',
      dosage: '15-20 min, 35-50 Hz, with active co-contraction',
      rationale: 'Facilitate motor unit recruitment by externally depolarizing motor neurons, overcoming arthrogenic inhibition',
      evidenceGrade: 'A',
      references: [
        { authors: 'Snyder-Mackler L, Delitto A, Bailey SL, Stralka SW', year: 1995, title: 'Strength of the quadriceps femoris muscle and functional recovery after ACL reconstruction', journal: 'J Bone Joint Surg Am', pmid: '7822354' },
      ],
      guidelineSource: 'JOSPT CPG 2017',
    },
    {
      name: 'Tactile cueing with biofeedback',
      type: 'manual',
      dosage: 'Apply during all activation exercises',
      rationale: 'Enhanced proprioceptive input via cutaneous mechanoreceptor stimulation to improve motor recruitment timing',
      evidenceGrade: 'C',
      references: [
        { authors: 'Hides JA, Richardson CA, Jull GA', year: 1996, title: 'Multifidus muscle recovery is not automatic after resolution of acute low back pain', journal: 'Spine', pmid: '8961451' },
      ],
    },
  ],
  weak: [
    {
      name: 'Progressive resistance training',
      type: 'exercise',
      dosage: '2-4 x 8-12 reps at 60-80% 1RM, 2-3x/week',
      rationale: 'Mechanical overload drives myofibrillar hypertrophy and neural adaptation',
      evidenceGrade: 'A',
      references: [
        { authors: 'American College of Sports Medicine', year: 2009, title: 'Progression models in resistance training for healthy adults', journal: 'Med Sci Sports Exerc', pmid: '19204579' },
      ],
      guidelineSource: 'ACSM Guidelines 2021',
    },
    {
      name: 'Functional compound strengthening',
      type: 'exercise',
      dosage: '3 x 10-15 reps, multi-joint movements',
      rationale: 'Integrate strength gains into functional movement patterns for carryover to daily activities',
      evidenceGrade: 'B',
      references: [
        { authors: 'Siff MC', year: 2003, title: 'Supertraining (6th edition)', journal: 'Supertraining Institute' },
      ],
    },
    {
      name: 'Blood flow restriction (BFR) training',
      type: 'exercise',
      dosage: '30-15-15-15 reps at 20-30% 1RM with 40-80% occlusion',
      rationale: 'Achieve hypertrophy with low loads via metabolic stress - suitable when high loads are contraindicated',
      evidenceGrade: 'A',
      references: [
        { authors: 'Hughes L, Paton B, Rosenblatt B, Gissane C, Patterson SD', year: 2017, title: 'Blood flow restriction training in clinical musculoskeletal rehabilitation', journal: 'Br J Sports Med', pmid: '28554891' },
      ],
    },
  ],
  spasm: [
    {
      name: 'Gentle sustained pressure (muscle energy)',
      type: 'manual',
      dosage: '3-5 reps: 5s isometric at 20% MVC then gentle stretch to new barrier',
      rationale: 'Post-isometric relaxation via Golgi tendon organ activation reduces protective muscle guarding',
      evidenceGrade: 'B',
      references: [
        { authors: 'Franke H, Fryer G, Ostelo RW, Kamper SJ', year: 2015, title: 'Muscle energy technique for non-specific low-back pain', journal: 'Cochrane Database Syst Rev', pmid: '25723574' },
      ],
    },
    {
      name: 'Positional release / strain-counterstrain',
      type: 'manual',
      dosage: '90s hold in position of comfort, reassess tender point',
      rationale: 'Reset gamma motor neuron bias by slackening the muscle spindle in the shortened position',
      evidenceGrade: 'C',
      references: [
        { authors: 'Jones LH', year: 1995, title: 'Jones Strain-Counterstrain', journal: 'Jones Strain-Counterstrain Inc' },
      ],
    },
    {
      name: 'Moist heat application',
      type: 'modality',
      dosage: '15-20 min moist heat pack, monitor skin',
      rationale: 'Increase local blood flow, reduce muscle spindle sensitivity, and promote tissue extensibility',
      evidenceGrade: 'C',
      references: [
        { authors: 'Malanga GA, Yan N, Stark J', year: 2015, title: 'Mechanisms and efficacy of heat and cold therapies for musculoskeletal injury', journal: 'Postgrad Med', pmid: '25526231' },
      ],
    },
  ],
  lengthened: [
    {
      name: 'Concentric strengthening in inner range',
      type: 'exercise',
      dosage: '3 x 15-20 reps in shortened position, 3x/week',
      rationale: 'Promote sarcomere absorption to restore optimal resting length and passive tension',
      evidenceGrade: 'B',
      references: [
        { authors: 'Sahrmann SA', year: 2002, title: 'Diagnosis and Treatment of Movement Impairment Syndromes', journal: 'Mosby/Elsevier' },
      ],
    },
    {
      name: 'Postural taping / kinesiology tape',
      type: 'modality',
      dosage: 'Apply with 25-50% tension during functional activities',
      rationale: 'External proprioceptive cue to maintain shortened position while motor patterns are retrained',
      evidenceGrade: 'C',
      references: [
        { authors: 'Morris D, Jones D, Ryan H, Ryan CG', year: 2013, title: 'The clinical effects of Kinesio Tex taping: a systematic review', journal: 'Physiother Theory Pract', pmid: '22924883' },
      ],
    },
    {
      name: 'Isometric holds in shortened position',
      type: 'exercise',
      dosage: '3 x 10-15s holds at end range, moderate effort',
      rationale: 'Develop holding strength at optimal shortened position to counter chronic lengthening',
      evidenceGrade: 'Expert',
      references: [
        { authors: 'Kendall FP, McCreary EK, Provance PG', year: 2005, title: 'Muscles: Testing and Function with Posture and Pain (5th ed)', journal: 'Lippincott Williams & Wilkins' },
      ],
    },
  ],
  normal: [],
};

export function getLinkedEvidenceForCandidate(candidateId: string, linkedDbKeys: ClinicalStatusKey[]): TechniqueEvidence[] {
  const results: TechniqueEvidence[] = [];
  for (const key of linkedDbKeys) {
    const techniques = SHARED_TECHNIQUE_DB[key];
    if (techniques) {
      results.push(...techniques);
    }
  }
  return results;
}
