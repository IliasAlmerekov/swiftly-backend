import { getDefaultContainer } from "../composition/index.js";
import {
  countHits as _countHits,
  detectLang as _detectLang,
  matchAny as _matchAny,
} from "../application/ai/policy/aiPolicy.js";

const aiService = getDefaultContainer().services.aiService;

export default aiService;
export { _detectLang, _matchAny, _countHits };
