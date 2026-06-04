(function () {
  const NS = window.LinkedInHiringExtension || (window.LinkedInHiringExtension = {});

  function sigmoid(value) {
    return 1 / (1 + Math.exp(-value));
  }

  function computeFeatureWeights(result, entities) {
    const signals = result && result.signals ? result.signals : {};
    const roleCount = Array.isArray(entities && entities.roleTitles) ? entities.roleTitles.length : 0;
    const hasCompany = Boolean((entities && entities.companyName) || (entities && entities.authorType === "Company" && entities.authorName));

    return {
      bias: -1.15,
      buriedHiringTail: signals.buriedHiringTail ? 1.45 : 0,
      futureBuilderContext: signals.futureBuilderContext ? 1.15 : 0,
      narrativeLead: signals.hasNarrativeLead ? 0.55 : 0,
      tailActionability: Math.min(1.6, Number(result && result.tailActionabilityScore ? result.tailActionabilityScore : 0) * 0.22),
      tailHiring: Math.min(1.4, Number(result && result.tailHiringScore ? result.tailHiringScore : 0) * 0.12),
      netHiring: Math.min(1.5, Math.max(0, ((result && result.hiringScore) || 0) - ((result && result.negativeScore) || 0)) * 0.14),
      roleSignal: roleCount > 0 ? 0.75 : 0,
      companySignal: hasCompany ? 0.45 : 0,
      closedPenalty: (result && result.closureScore) ? -2 : 0,
      selfSeekingPenalty: signals.isLikelySelfSeeking ? -2.3 : 0,
      personalAnnouncementPenalty: signals.isLikelyPersonalAnnouncement ? -2 : 0,
      consultingPenalty: signals.isLikelyConsultingPost ? -1.2 : 0,
      explicitNoPenalty: signals.explicitNoOpeningSignal ? -2.2 : 0,
      nativeJobBoost: entities && entities.hasNativeJobCard ? 1 : 0
    };
  }

  function sumWeights(weights) {
    return Object.values(weights).reduce((total, value) => total + Number(value || 0), 0);
  }

  NS.uncertainPostFallback = {
    evaluate(rawText, result, entities) {
      if (!result || result.label !== NS.constants.badgeStates.NONE) {
        return {
          promotedLabel: result ? result.label : NS.constants.badgeStates.NONE,
          probability: 0,
          used: false,
          reasons: []
        };
      }

      const signals = result.signals || {};
      if (result.closureScore > 0
        || signals.isLikelySelfSeeking
        || signals.isLikelyPersonalAnnouncement
        || (signals.explicitNoOpeningSignal && !signals.hasQualifiedNotHiringNarrative)) {
        return {
          promotedLabel: result.label,
          probability: 0,
          used: false,
          reasons: ["fallback-blocked:explicit-negative"]
        };
      }

      const weights = computeFeatureWeights(result, entities || {});
      const probability = sigmoid(sumWeights(weights));
      const shouldPromote = probability >= 0.67
        || (signals.buriedHiringTail && probability >= 0.58);

      const reasons = Object.entries(weights)
        .filter(([, value]) => Math.abs(value) >= 0.45)
        .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
        .slice(0, 4)
        .map(([name]) => `fallback:${name}`);

      return {
        promotedLabel: shouldPromote ? NS.constants.badgeStates.MAYBE : result.label,
        probability,
        used: true,
        reasons
      };
    }
  };
}());
