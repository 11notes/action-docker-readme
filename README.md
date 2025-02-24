# create README.md for all Docker images
This action will create the README.md for my container image builds on github and Docker hub.

## Inputs

### `sarif_file`

The grype sarif report (if present)

### `build_log_file`

The build log of the container image

### YML example 
```yml
- name: buildx to log
  id: buildx
  run: |
    BUILDX_LOG=/tmp/buildx.log
    docker buildx history logs >& ${BUILDX_LOG}
    echo "log=${BUILDX_LOG}" >> $GITHUB_OUTPUT

- name: grype sarif report
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
    build_log_file: ${{ steps.buildx.outputs.log }}
```