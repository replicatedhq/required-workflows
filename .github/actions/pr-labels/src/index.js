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
 * Extract semantic type from a PR title
 * Supports formats like:
 * - "feat: add new feature"
 * - "fix(component): fix bug"
 * - "chore: update dependencies"
 * @param {string} message - The PR title
 * @returns {string|null} - The semantic type or null if not found
 */
function extractSemanticType(message) {
  if (!message) return null;

  core.debug(`Attempting to extract semantic type from: "${message}"`);

  // Match standard semantic commit format: type(scope): message
  const semanticRegex = /^(\w+)(?:\([\w-]+\))?:\s/;
  const match = message.match(semanticRegex);

  if (match && match[1]) {
    const type = match[1].toLowerCase();
    core.debug(`Extracted semantic type: "${type}"`);
    return type;
  }

  core.debug("No semantic type found in message");
  return null;
}

async function run() {
  try {
    // get inputs
    const token = core.getInput("token", { required: true });
    core.debug("Token retrieved successfully");

    // set up github client
    const octokit = github.getOctokit(token);
    core.debug("GitHub client initialized");

    // fetch the list of labels
    core.debug("Fetching current PR labels...");
    const labels = (
      await octokit.rest.issues.listLabelsOnIssue({
        ...github.context.repo,
        issue_number: github.context.issue.number,
      })
    ).data.map((label) => label.name);
    core.debug(`Found ${labels.length} labels: ${labels.join(", ")}`);

    // Check if any type:: labels already exist
    const existingTypeLabels = labels.filter(label => label.startsWith("type::"));
    core.debug(`Found ${existingTypeLabels.length} type labels: ${existingTypeLabels.join(", ")}`);

    // If type labels already exist, skip adding new labels
    if (existingTypeLabels.length > 0) {
      core.info("Type labels already exist on PR, skipping adding new labels");
    } else {
      // Get PR details to check for semantic PR title
      await addSemanticLabels(octokit, labels);
    }

    // ensure exactly one primary label is set
    core.debug("Checking for primary labels...");
    const primaryLabels = PRIMARY_LABELS.filter((label) =>
      labels.includes(label)
    );
    core.debug(`Found ${primaryLabels.length} primary labels: ${primaryLabels.join(", ")}`);

    if (primaryLabels.length !== 1) {
      core.debug(`Primary label check failed: found ${primaryLabels.length} primary labels`);
      throw new Error(
        `Exactly one primary label must be set from [${PRIMARY_LABELS.join(", ")}]. Found: ${primaryLabels.join(", ")}`
      );
    }
    core.debug("Primary label check passed");

    // if the primary label is a bug, ensure a bug label is set
    if (primaryLabels[0] === "type::bug") {
      core.debug("Primary label is type::bug, checking for bug labels...");
      const bugLabels = BUG_LABELS.filter((label) => labels.includes(label));
      core.debug(`Found ${bugLabels.length} bug labels: ${bugLabels.join(", ")}`);
      if (bugLabels.length !== 1) {
        core.debug(`Bug label check failed: found ${bugLabels.length} bug labels`);
        throw new Error(
          `Exactly one bug label must be set for primary type::bug. Found: ${bugLabels.join(
            ", "
          )}`
        );
      }
      core.debug("Bug label check passed");
    }

    // ensure no more than one severity label is set
    core.debug("Checking for severity labels...");
    const severityLabels = SEVERITY_LABELS.filter((label) =>
      labels.includes(label)
    );
    core.debug(`Found ${severityLabels.length} severity labels: ${severityLabels.join(", ")}`);
    if (severityLabels.length > 1) {
      core.debug(`Severity label check failed: found ${severityLabels.length} severity labels`);
      throw new Error(
        `No more than one severity label may be set. Found: ${severityLabels.join(
          ", "
        )}`
      );
    }
    core.debug("Severity label check passed");

  } catch (error) {
    core.debug(`Error caught: ${error.message}`);
    if (error instanceof Error) core.setFailed(error.message);
  }
}

/**
 * Add labels based on semantic PR title
 * @param {object} octokit - GitHub API client
 * @param {string[]} labels - Current labels array to update
 * @returns {Promise<void>}
 */
async function addSemanticLabels(octokit, labels) {
  const prNumber = github.context.issue.number;
  core.debug(`Processing PR #${prNumber}`);

  core.debug("Fetching PR details...");
  const { data: pullRequest } = await octokit.rest.pulls.get({
    ...github.context.repo,
    pull_number: prNumber,
  });

  // Get the PR title
  const prTitle = pullRequest.title;
  core.debug(`PR title: "${prTitle}"`);

  // Try to extract semantic type from PR title only
  core.debug("Extracting semantic type from PR title...");
  const semanticType = extractSemanticType(prTitle);
  
  if (semanticType) {
    core.debug(`Using semantic type from PR title: "${semanticType}"`);
  } else {
    core.debug("No semantic type found in PR title");
    return;
  }

  // If we found a semantic type that maps to one of our labels, add it if not present
  if (!SEMANTIC_TYPE_TO_LABEL[semanticType]) {
    core.debug(`Semantic type "${semanticType}" does not map to any of our labels`);
    return;
  }

  const labelToAdd = SEMANTIC_TYPE_TO_LABEL[semanticType];
  core.debug(`Semantic type "${semanticType}" maps to label "${labelToAdd}"`);

  // Only add the label if it's not already present
  if (labels.includes(labelToAdd)) {
    core.debug(`Label "${labelToAdd}" already exists on PR, no need to add it`);
    return;
  }

  core.info(`Adding label ${labelToAdd} based on semantic PR title type: ${semanticType}`);

  core.debug("Calling GitHub API to add label...");
  await octokit.rest.issues.addLabels({
    ...github.context.repo,
    issue_number: prNumber,
    labels: [labelToAdd],
  });
  core.debug("Label added successfully via API");

  // Update our local labels array to include the new label
  labels.push(labelToAdd);
  core.debug(`Updated local labels array: ${labels.join(", ")}`);

  core.info("Added label based on semantic PR title. Waiting for label to apply...");
  // Short delay to allow the label to be properly registered
  core.debug("Waiting 2 seconds for label to propagate...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  core.debug("Wait completed");

  // Refetch the labels to ensure we have the most up-to-date set
  core.info("Refetching labels after adding semantic label...");
  core.debug("Calling GitHub API to get updated labels...");
  const updatedLabelsResponse = await octokit.rest.issues.listLabelsOnIssue({
    ...github.context.repo,
    issue_number: github.context.issue.number,
  });

  // Update our labels array with the freshly fetched labels
  const updatedLabels = updatedLabelsResponse.data.map((label) => label.name);
  core.debug(`Refetched ${updatedLabels.length} labels: ${updatedLabels.join(", ")}`);

  // Replace our labels array with the updated one
  labels.length = 0;
  updatedLabels.forEach(label => labels.push(label));
  core.debug(`Updated local labels array after refetch: ${labels.join(", ")}`);
}

run();
