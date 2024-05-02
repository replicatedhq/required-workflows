require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 250:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 720:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(250);
const github = __nccwpck_require__(720);

// Label sets (secondary labels are not included here)
const PRIMARY_LABELS = [
  "type::chore",
  "type::bug",
  "type::feature",
  "type::security",
];

const BUG_LABELS = ["bug::normal", "bug::regression"];

const SEVERITY_LABELS = ["severity::s1", "severity::s2", "severity::s3"];

async function run() {
  try {
    // get inputs
    const token = core.getInput("token", { required: true });

    // set up github client
    const octokit = github.getOctokit(token);

    // fetch the list of labels
    const labels = (
      await octokit.rest.issues.listLabelsOnIssue({
        ...github.context.repo,
        issue_number: github.context.issue.number,
      })
    ).data.map((label) => label.name);
    core.debug(`Found labels: ${labels.join(", ")}`);

    // ensure exactly one primary label is set
    const primaryLabels = PRIMARY_LABELS.filter((label) =>
      labels.includes(label)
    );
    core.debug(`Found primary labels: ${primaryLabels.join(", ")}`);
    if (primaryLabels.length !== 1) {
      throw new Error(
        `Exactly one primary label must be set from [${PRIMARY_LABELS.join(", ")}]. Found: ${primaryLabels.join(", ")}`
      );
    }

    // if the primary label is a bug, ensure a bug label is set
    if (primaryLabels[0] === "type::bug") {
      const bugLabels = BUG_LABELS.filter((label) => labels.includes(label));
      core.debug(`type::bug is set, found bug labels: ${bugLabels.join(", ")}`);
      if (bugLabels.length !== 1) {
        throw new Error(
          `Exactly one bug label must be set for primary type::bug. Found: ${bugLabels.join(
            ", "
          )}`
        );
      }
    }

    // ensure no more than one severity label is set
    const severityLabels = SEVERITY_LABELS.filter((label) =>
      labels.includes(label)
    );
    core.debug(`Found severity labels: ${severityLabels.join(", ")}`);
    if (severityLabels.length > 1) {
      throw new Error(
        `No more than one severity label may be set. Found: ${severityLabels.join(
          ", "
        )}`
      );
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map