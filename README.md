# create README.md for all Docker images
This action will create the README.md for my container image builds on github and Docker hub.

## Inputs

### `sarif_file`

The grype sarif report (if present)

### `image_build_output`

The complete output of the build stage

### YML example 
```yml
- name: build
  id: build
  uses: docker/build-push-action
  with:
    context: .
    file: Dockerfile
    platforms: linux/amd64,linux/arm64

- name: grype
  id: grype
  uses: anchore/scan-action
  with:
    image: 11notes/alpine:stable
    severity-cutoff: high
    by-cve: true
    output-format: 'sarif'

- name: create README.md
  uses: 11notes/action-docker-readme@v1
  with:
    sarif_file: ${{ steps.grype.outputs.sarif }}
    image_build_output: ${{ steps.build.outputs }}
```