class ValidationService {
  static validateQuestionStructure(q) {
    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
      return { valid: false, reason: "Invalid format or options count" };
    }
    if (!q.correct_answer || !q.options.includes(q.correct_answer)) {
      return { valid: false, reason: "Correct answer not present in options" };
    }
    const uniqueOptions = new Set(q.options.map(o => o.trim().toLowerCase()));
    if (uniqueOptions.size !== 4) {
      return { valid: false, reason: "Duplicate options detected" };
    }
    return { valid: true };
  }

  static verifyFactIntegrity(q) {
    if (!q.confidence_score || q.confidence_score < 0.90) {
      return { valid: false, reason: "Low confidence score" };
    }
    if (!q.source_url || q.source_url.length < 5) {
      return { valid: false, reason: "Missing or unverified source" };
    }
    return { valid: true };
  }
}

module.exports = ValidationService;
