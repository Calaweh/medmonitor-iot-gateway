# Clinical Evaluation Report (CER)
**Document ID:** MED-CER-001

## 1. Objective
To demonstrate the clinical validity and safety of the MedMonitor application, specifically regarding its alarm generation and suppression algorithms in step-down and MIC@Home environments.

## 2. Clinical Justification: Alarm Fatigue Suppression
**Algorithm:** 5-minute rolling suppression window for duplicate alert types.
**Literature Evidence:** 
Cvach, M. (2012). *Monitor Alarm Fatigue: An Integrative Review.* Nursing & Health Sciences. 
**Justification:** Cvach (2012) demonstrates that up to 99% of clinical alarms are false or clinically insignificant, leading to severe alarm fatigue. Implementing a short suppression window for transient threshold breaches significantly increases the Positive Predictive Value (PPV) of alarms without compromising patient safety in non-ICU settings.

## 3. Clinical Justification: MEWS Scoring
**Algorithm:** Modified Early Warning Score (MEWS).
**Literature Evidence:**
Subbe, C. P., et al. (2001). *Validation of a modified Early Warning Score in medical admissions.* QJM: An International Journal of Medicine.
**Justification:** Relying on single-parameter thresholds (e.g., just HR or just SpO2) catches deterioration late. The MEWS algorithm (implemented in `ReadingService.cs`) calculates a composite score based on HR, RR, BP, and Temp. Subbe et al. proved that a MEWS score $\ge$ 4 is a clinically validated trigger for immediate clinical review, justifying our `HIGH_MEWS_SCORE` critical alert.