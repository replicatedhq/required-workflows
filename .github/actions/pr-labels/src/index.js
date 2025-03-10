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

// Map semantic commit types to our label types
const SEMANTIC_TYPE_TO_LABEL = {
  chore: "type::chore",
  fix: "type::bug",
  bug: "type::bug",
  feat: "type::feature",
  feature: "type::feature",
  security: "type::security",
};

/**
 * Extract semantic commit type from a message
 * Supports formats like:
 * - "feat: add new feature"
 * - "fix(component): fix bug"
 * - "chore: update dependencies"
 * @param {string} message - The commit message or PR title
 * @returns {string|null} - The semantic type or null if not found
 */
function extractSemanticType(message) {
  if (!message) return null;

  // Match standard semantic commit format: type(scope): message
  const semanticRegex = /^(\w+)(?:\([\w-]+\))?:\s/;
  const match = message.match(semanticRegex);

  if (match && match[1]) {
    return match[1].toLowerCase();
  }

  return null;
}

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

    // Get PR details to check for semantic commit messages
    const prNumber = github.context.issue.number;
    const { data: pullRequest } = await octokit.rest.pulls.get({
      ...github.context.repo,
      pull_number: prNumber,
    });

    // Get the PR title and HEAD commit message
    const prTitle = pullRequest.title;

    // Get the HEAD commit message
    const { data: commits } = await octokit.rest.pulls.listCommits({
      ...github.context.repo,
      pull_number: prNumber,
    });

    const headCommitMessage = commits.length > 0 ? commits[commits.length - 1].commit.message : null;

    // Try to extract semantic type from PR title or HEAD commit
    const prTitleType = extractSemanticType(prTitle);
    const commitType = extractSemanticType(headCommitMessage);

    // Use PR title type first, then fall back to commit type
    const semanticType = prTitleType || commitType;

    // If we found a semantic type that maps to one of our labels, add it if not present
    if (semanticType && SEMANTIC_TYPE_TO_LABEL[semanticType]) {
      const labelToAdd = SEMANTIC_TYPE_TO_LABEL[semanticType];

      // Only add the label if it's not already present
      if (!labels.includes(labelToAdd)) {
        core.info(`Adding label ${labelToAdd} based on semantic commit type: ${semanticType}`);
        await octokit.rest.issues.addLabels({
          ...github.context.repo,
          issue_number: prNumber,
          labels: [labelToAdd],
        });

        // Update our local labels array to include the new label
        labels.push(labelToAdd);
      }
    }

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
