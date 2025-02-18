# create README.md for all Docker images
This action will create the README.md for my container image builds on github and Docker hub.

## Inputs

### `sarif_file`

The grype sarif report (if present)

### YML example 
```yml
- name: JSON to variables
  uses: 11notes/action-docker-readme@v1
  with:
    sarif_file: 'report.sarif'
```
