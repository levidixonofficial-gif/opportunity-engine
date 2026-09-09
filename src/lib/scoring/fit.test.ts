import { describe, expect, it } from "vitest";
import { scoreOpportunity, type ScorerOpportunity, type ScorerProfile } from "./fit";

const baseOpp: ScorerOpportunity = {
  name: "Test opp",
  difficulty: 2,
  learningCurve: 2,
  competitionLevel: 3,
  scalability: 4,
  demandScore: 4,
  startupCostBand: "50_250",
  timeCommitment: "1_hr",
  beginnerFriendly: true,
  isServiceBased: true,
  requiredSkillSlugs: ["sales"],
  helpfulSkillSlugs: ["writing"],
  interestSlugs: ["marketing"],
};

const baseProfile: ScorerProfile = {
  primaryGoal: "side_income",
  budgetBand: "250_1000",
  timeBand: "2_3_hr",
  experienceLevel: "some",
  skillSlugs: ["sales", "writing"],
  interestSlugs: ["marketing"],
};

describe("scoreOpportunity", () => {
  it("returns an integer score in [0,100]", () => {
    const r = scoreOpportunity(baseProfile, baseOpp);
    expect(Number.isInteger(r.score)).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("gives a strong score for a well-matched profile", () => {
    expect(scoreOpportunity(baseProfile, baseOpp).score).toBeGreaterThanOrEqual(80);
  });

  it("scores lower when the user lacks the required skills", () => {
    const withSkills = scoreOpportunity(baseProfile, baseOpp).score;
    const withoutSkills = scoreOpportunity(
      { ...baseProfile, skillSlugs: ["photography"] },
      baseOpp,
    ).score;
    expect(withoutSkills).toBeLessThan(withSkills);
  });

  it("scores lower when the opportunity costs more than the budget", () => {
    const affordable = scoreOpportunity(baseProfile, { ...baseOpp, startupCostBand: "lt_50" }).score;
    const tooPricey = scoreOpportunity(baseProfile, { ...baseOpp, startupCostBand: "1000_plus" }).score;
    expect(tooPricey).toBeLessThan(affordable);
  });

  it("scores lower when the opportunity needs more time than the user has", () => {
    const fits = scoreOpportunity(
      { ...baseProfile, timeBand: "4_plus_hr" },
      { ...baseOpp, timeCommitment: "4_plus_hr" },
    ).score;
    const doesNotFit = scoreOpportunity(
      { ...baseProfile, timeBand: "30_min" },
      { ...baseOpp, timeCommitment: "4_plus_hr" },
    ).score;
    expect(doesNotFit).toBeLessThan(fits);
  });

  it("is deterministic", () => {
    const a = scoreOpportunity(baseProfile, baseOpp);
    const b = scoreOpportunity(baseProfile, baseOpp);
    expect(a).toEqual(b);
  });

  it("produces human-readable reasons for a good match", () => {
    const r = scoreOpportunity(baseProfile, baseOpp);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons.every((x) => typeof x === "string" && x.length > 0)).toBe(true);
  });

  it("breakdown contributions never exceed their max", () => {
    const r = scoreOpportunity(baseProfile, baseOpp);
    for (const b of r.breakdown) {
      expect(b.contribution).toBeLessThanOrEqual(b.max);
      expect(b.contribution).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles an empty profile without throwing", () => {
    const empty: ScorerProfile = {
      primaryGoal: null,
      budgetBand: null,
      timeBand: null,
      experienceLevel: null,
      skillSlugs: [],
      interestSlugs: [],
    };
    const r = scoreOpportunity(empty, baseOpp);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("ranks a better-fitting opportunity above a worse one", () => {
    const good = scoreOpportunity(baseProfile, baseOpp).score;
    const bad = scoreOpportunity(baseProfile, {
      ...baseOpp,
      difficulty: 5,
      startupCostBand: "1000_plus",
      timeCommitment: "4_plus_hr",
      competitionLevel: 5,
      demandScore: 1,
      requiredSkillSlugs: ["web-dev", "design"],
      helpfulSkillSlugs: [],
    }).score;
    expect(good).toBeGreaterThan(bad);
  });
});
