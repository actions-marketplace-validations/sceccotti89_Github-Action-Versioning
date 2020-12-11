const BASE_VERSION = '0.0.1';
const TAG_REF = 'refs/tags/';
const BRANCH_REF = 'refs/heads/';
const PULL_REQUEST_SOURCE_BRANCH_NAME_REGEX = /[a-zA-Z][a-zA-Z0-9_]*-(\d+\.\d+\.\d+)/;

export type ProcessResult = { version?: string; error?: string | Error };

export default (github: any): ProcessResult => {
    try {
        const base_ref: string = github.context.payload.base_ref;
        if (isPullRequest(base_ref)) {
            return handlePullRequest(github, base_ref);
        } else {
            // PUSH
            const ref = github.context.ref;
            if (isTag(ref)) {
                return { version: extractBranchNameFromRef(ref) };
            } else {
                const branch = extractBranchNameFromRef(ref);
                const sha = github.context.sha.substr(0, 8);
                return { version: `${branch}-${sha}` };
            }
        }
    } catch (error) {
        return { error: error.message };
    }
};

function handlePullRequest(github: any, base_ref: string): ProcessResult {
    const source_branch = extractBranchNameFromRef(base_ref);
    if (!source_branch.match(PULL_REQUEST_SOURCE_BRANCH_NAME_REGEX)) {
        return { error: 'Invalid source branch name. Please follow the following regex for naming: ' + PULL_REQUEST_SOURCE_BRANCH_NAME_REGEX };
    } else {
        const version = extractVersionNumber(base_ref);
    
        const ref = github.context.ref;
        const sha = github.context.sha.substr(0, 8);
        let version_name;

        if (isMasterBranch(ref)) {
            version_name = `${version}`;
        } else {
            const branch = extractBranchNameFromRef(ref);
            if (isReleaseBranch(ref) || isDevelopBranch(ref) || isFeatureBranch(ref) || isHotfixBranch(ref)) {
                version_name = `${branch}-${version}-${sha}`;
            } else {
                return { error: 'Unrecognized destination branch name: ' + branch };
            }
        }
    
        return { version: version_name };
    }
}

function isPullRequest(base_ref: string): boolean {
    return base_ref != null;
}

function isTag(ref: string): boolean { return ref.startsWith(TAG_REF) }

function isMasterBranch(ref: string): boolean { return ref.startsWith(`${BRANCH_REF}master`); }
function isReleaseBranch(ref: string): boolean { return ref.startsWith(`${BRANCH_REF}release`); }
function isDevelopBranch(ref: string): boolean { return ref.startsWith(`${BRANCH_REF}develop`); }
function isFeatureBranch(ref: string): boolean { return ref.startsWith(`${BRANCH_REF}feature`); }
function isHotfixBranch(ref: string): boolean { return ref.startsWith(`${BRANCH_REF}hotfix`); }

function extractBranchNameFromRef(ref: string): string {
    return ref.substr(ref.lastIndexOf('/') + 1);
}

function extractVersionNumber(base_ref: string): string {
    const sub_base_ref = base_ref.substr(base_ref.lastIndexOf('/') + 1);
    const groups = sub_base_ref.match(PULL_REQUEST_SOURCE_BRANCH_NAME_REGEX);
    return groups ? groups[1] : BASE_VERSION;
}