# create README.md for all Docker images
This action will create the README.md for my container image builds on github and Docker hub.

## Inputs

### `sarif_file`

The grype sarif report (if present)

### YML example 
```yml
- name: grype / scan
  id: grype-scan
  uses: anchore/scan-action@abae793926ec39a78ab18002bc7fc45bbbd94342
  with:
    image: 11notes/alpine:stable
    severity-cutoff: high
    by-cve: true
    output-format: 'sarif'

- name: github / create README.md
  uses: 11notes/action-docker-readme@v1
  with:
    sarif_file: ${{ steps.grype-scan.outputs.sarif }}
```
