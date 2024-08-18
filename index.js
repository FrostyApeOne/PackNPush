const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const exec = require('child_process').execSync;

function sanitizeNugetSource(nugetSource) {
    return nugetSource.replace(/\/index\.json$/, '').replace(/\/$/, '');
}

function execCommand(command) {
    console.log(`Executing command: ${command}`);
    try {
        const output = exec(command, { stdio: 'pipe', shell: true, encoding: 'utf-8' }).trim();
        console.log(`Raw command output:\n${output}`);
        return output;
    } catch (error) {
        console.error(`Error executing command: ${command}`);
        console.error(`Command stdout: ${error.stdout?.toString() || 'null'}`);
        console.error(`Command stderr: ${error.stderr?.toString() || 'null'}`);
        throw error;
    }
}

async function run() {
    try {
        // Inputs
        const githubToken = core.getInput('github-token', { required: true });
        const nugetSource = core.getInput('nuget-source', { required: true });
        const packageId = core.getInput('package-id', { required: true });
        const workDirectory = core.getInput('work-directory', { required: true });
        const versionPrefix = core.getInput('version-prefix') || 'processed-';
        const commitRange = core.getInput('commit-range') || '10';
        const noBuild = core.getInput('no-build') === 'true';
        const packAndPublish = core.getInput('pack-and-publish') === 'true';

        process.chdir(workDirectory);

        // Get the last commits
        const lastCommits = execCommand(`git log -n ${commitRange} --pretty=format:"%H %s"`);

        // Filter matching commits
        const matchingCommit = lastCommits.split('\n').find(commit => commit.match(/\(#update package version to \d+\.\d+\.\d+\)/));
        console.log("Matching commits:\n" + (matchingCommit || "None found"));

        let newVersion = '';

        if (matchingCommit) {
            const commitHash = matchingCommit.split(' ')[0];
            console.log(`Found commit with version update indicator: ${commitHash}`);

            try {
                execCommand(`git rev-parse "${versionPrefix}${commitHash}"`);
                console.log('This commit has already been processed for version update. Skipping.');
            } catch {
                // Extract version from the commit message
                const customVersionMatch = matchingCommit.match(/\(#update package version to (\d+\.\d+\.\d+)\)/);

                if (customVersionMatch) {
                    newVersion = customVersionMatch[1];
                    console.log(`Using custom version: ${newVersion}`);

                    // Tag the commit to prevent reprocessing
                    execCommand(`git tag "${versionPrefix}${commitHash}"`);
                    execCommand(`git push origin "${versionPrefix}${commitHash}"`);
                } else {
                    throw new Error('Failed to extract version from commit message.');
                }
            }
        }

        if (!newVersion) {
            console.log('No unprocessed custom version found in the last commits. Proceeding to fetch and increment the latest version from the feed.');

            nugetSourceSanitized = sanitizeNugetSource(nugetSource);

            const feedUrl = `${nugetSourceSanitized}/query?q=${packageId}`;
            const response = await axios.get(feedUrl, {
                headers: {
                    Authorization: `token ${githubToken}`
                }
            });

            const latestVersion = response.data.data[0]?.version;

            if (!latestVersion) {
                console.log('No existing version found in the feed. Defaulting to version 1.0.0');
                newVersion = '1.0.0';
            } else {
                console.log(`Latest version is ${latestVersion}`);
                const versionParts = latestVersion.split('.');
                newVersion = `${versionParts[0]}.${versionParts[1]}.${parseInt(versionParts[2], 10) + 1}`;
                console.log(`Incrementing to new version: ${newVersion}`);
            }
        }

        core.setOutput('NEW_VERSION', newVersion);

        if (packAndPublish) {
            console.log('Building, packing, and publishing the package.');

            execCommand('dotnet build -c Release');

            if (noBuild) {
                execCommand(`dotnet pack --no-build -c Release -p:PackageVersion="${newVersion}" --output .`);
            } else {
                execCommand(`dotnet pack -c Release -p:PackageVersion="${newVersion}" --output .`);
            }

            execCommand(`dotnet nuget push "*.nupkg" --api-key "${githubToken}" --source "${nugetSource}"`);

        } else {
            console.log('Skipping packing and publishing as per configuration.');
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
