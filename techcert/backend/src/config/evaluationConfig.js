const evaluationSettingsService = require("../services/evaluationSettingsService");

module.exports = {
  getEvaluationConfig: evaluationSettingsService.getEvaluationConfig,
  isWithinEvaluationWindow: evaluationSettingsService.isWithinEvaluationWindow,
  refreshEvaluationConfig: evaluationSettingsService.refreshEvaluationConfig,
};
