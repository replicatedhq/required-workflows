const core = require("@actions/core");
const github = require("@actions/github");

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
    ).data;

    // ensure exactly one primary label is set
    const primaryLabels = PRIMARY_LABELS.filter((label) => labels.includes(label));
    if (primaryLabels.length !== 1) {
      throw new Error(
        `Exactly one primary label must be set. Found: ${primaryLabels.join(
          ", "
        )}`
      );
    }

    // if the primary label is a bug, ensure a bug label is set
    if (primaryLabels[0] === "type::bug") {
      const bugLabels = BUG_LABELS.filter((label) => labels.includes(label));
      if (bugLabels.length !== 1) {
        throw new Error(
          `Exactly one bug label must be set for primary type::bug. Found: ${bugLabels.join(
            ", "
          )}`
        );
      }
    }

    // ensure no more than one severity label is set
    const severityLabels = SEVERITY_LABELS.filter((label) => labels.includes(label));
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
