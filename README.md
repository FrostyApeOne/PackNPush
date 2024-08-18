# PackNPush

PackNPush is a GitHub Action that automates version bumping and publishing of .NET NuGet packages to the GitHub Package Registry. This action integrates seamlessly into your CI/CD pipeline, handling version increments and package publication effortlessly.

## Features

- Automatically increments the patch version of your .NET NuGet packages.
- Supports custom versioning through commit messages.
- Publishes the updated package to the GitHub Package Registry.

## Requirements

This action is designed to work specifically with the GitHub Package Registry. Before using this action, ensure the following:

1. **GitHub Actions Permissions**: The action requires write access to your repository to push commits, create tags, and update versions. Make sure your GitHub token has the necessary permissions to perform these actions.

2. **Registry Access**: Ensure that the action has the necessary permissions to push packages to the GitHub Package Registry. This typically involves setting up the `GITHUB_TOKEN` secret in your GitHub repository.

3. **Full Commit History**: To ensure that the action can properly scan the last few commits for any unprocessed version update indicators, you need to set `fetch-depth` to `0` in the `actions/checkout` step of your GitHub Actions workflow. This allows the action to access the full commit history.

## Custom Versioning

By default, this action increments the **patch** part of the version (e.g., 1.0.5 → 1.0.6). However, if you want to manually bump the **minor** or **major** version, you can do so by including a specific pattern in your commit message:

- **Commit Message Format**: `(#update package version to *.*.*)`

### Example

If you want to update the version from `1.0.5` to `1.1.0`, include the following in your commit message:

`Updated some features (#update package version to 1.1.0)`

The action will detect this pattern, update the version accordingly, and publish the package with the new version.

## Important Notes

- **Commit Tags**: To ensure that the custom version bump is not applied multiple times, the action tags the commit after processing. Subsequent runs will ignore tagged commits.
  
- **Repository Permissions**: Ensure your GitHub token has both **write** access to push commits and **packages** access to publish to the registry.

## Generate Version Only

You can use this action to generate a new version for your package based on the commit message or the latest version in your NuGet feed, without actually packing and publishing the package. This is useful if you want to use the generated version elsewhere in your CI/CD pipeline.

To do this, set `pack-and-publish` to `false`

When you set `pack-and-publish` to `false`, the action will still generate the `NEW_VERSION` variable based on the commit messages or the latest version from your NuGet feed, but it will not proceed to pack and publish the NuGet package.

## Example Usage

To use this action in your workflow, simply include it as a step in your GitHub Actions YAML file. The action will automatically handle versioning and publishing based on your commits.

## Inputs

- `github-token`: **Required.** GitHub token to authenticate with the repository.
- `nuget-source`: **Required.** NuGet source URL where the package will be published.
- `package-id`: **Required.** The package ID to check and update the version for.
- `work-directory`: **Required.** The directory where the .NET project resides.
- `version-prefix`: Optional. Prefix to use when tagging commits. Default is `processed-`.
- `commit-range`: Optional. Number of commits to check for version bump message. Default is `10`.
- `no-build`: Optional. Set to true to skip the build during the dotnet pack command. Default is `false`.
- `pack-and-publish`: Optional. Set to 'true' to enable packing and publishing the NuGet package. Default is `true`.

## Example Workflow:


```yaml
on:
  push:
    branches:
      - main

jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Use PackNPush for version bump and publish
        uses: FrostyApeOne/PackNPush@v1.0.2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          nuget-source: "https://nuget.pkg.github.com/your-org/index.json"
          package-id: "YourPackageName"
          work-directory: "./src/YourProject"
          no-build: "true"
          pack-and-publish: "true"     

      - name: Use NEW_VERSION
        run: |
          echo "The generated version is ${{ env.NEW_VERSION }}"
          # Here you can use ${{ env.NEW_VERSION }} to perform other tasks

```
          
