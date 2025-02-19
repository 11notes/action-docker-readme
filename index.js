const fs = require('node:fs');
const { inspect } = require('node:util');
const path = require('node:path');
const core = require('@actions/core');

class README{
  #env = {};
  #header = [];
  #footer = [];

  #default = {
    title:{
      synopsis:'# SYNOPSIS 📖',
      volumes:'# VOLUMES 📁',
      built:'# BUILT WITH 🧰',
      build:'# BUILD 🚧',
      unraid:'# UNRAID VERSION 🟠',
      compose:'# COMPOSE ✂️',
      tips:'# GENERAL TIPS 📌',
      environment:'# ENVIRONMENT 📝',
      source:'# SOURCE 💾',
      parent:'# PARENT IMAGE 🏛️',
      config:'# DEFAULT CONFIG 📑',
      patches:'# PATCHED CVE 🦟',
      tags:'# MAIN TAGS 🏷️',
      defaults:'# DEFAULT SETTINGS 🗃️',
      sarif:'# SECURITY VULNERABILITIES REPORT ⚡',
    },
    content:{
      shields:`${[
        '[<img src="https://img.shields.io/badge/github-source-blue?logo=github&color=040308">](https://github.com/11notes/docker-${{ json_name }})',
        '![size](https://img.shields.io/docker/image-size/${{ json_image }}/${{ json_semver_version }}?color=0eb305)',
        '![version](https://img.shields.io/docker/v/${{ json_image }}/${{ json_semver_version }}?color=eb7a09)',
        '![pulls](https://img.shields.io/docker/pulls/${{ json_image }}?color=2b75d6)',
        '[<img src="https://img.shields.io/github/issues/11notes/docker-${{ json_name }}?color=7842f5">](https://github.com/11notes/docker-${{ json_name }}/issues)',
      ].join("")}`,
      tips:`\${{ title_tips }}\r\n${[
        '* Use a reverse proxy like Traefik, Nginx, HAproxy to terminate TLS and to protect your endpoints',
        '* Use Let’s Encrypt DNS-01 challenge to obtain valid SSL certificates for your services'
      ].join("\r\n")}`,
      unraid:"${{ title_unraid }}\r\nThis image supports unraid by default. Simply add **-unraid** to any tag and the image will run as 99:100 instead of 1000:1000 causing no issues on unraid. Enjoy.",
      build:"${{ title_build }}\r\n```dockerfile\r\n${{ include: ./build.dockerfile }}\r\n```",
      tags:'',
      synopsis:'\${{ title_synopsis }}\r\n**What can I do with this?**',
      environment:`\${{ title_environment }}\r\n${[
        '| Parameter | Value | Default |',
        '| --- | --- | --- |',
        '| `TZ` | [Time Zone](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) | |',
        '| `DEBUG` | Will activate debug option for container image and app (if available) | |',
      ].join("\r\n")}`,
      defaults:`\${{ title_defaults }}\r\n${[
        '| Parameter | Value | Description |',
        '| --- | --- | --- |',
        '| `user` | docker | user name |',
        '| `uid` | 1000 | [user identifier](https://en.wikipedia.org/wiki/User_identifier) |',
        '| `gid` | 1000 | [group identifier](https://en.wikipedia.org/wiki/Group_identifier) |',
        '| `home` | ${{ json_root }} | home directory of user docker |',
      ].join("\r\n")}`,
      parent:"${{ title_parent }}\r\n* [${{ json_readme_parent_image }}](${{ json_readme_parent_url }})",
      source:"${{ title_source }}\r\n* [${{ json_image }}](https://github.com/11notes/docker-${{ json_name }})",
      sarif:'',
    },
    text:{
      tags:'These are the main tags for the image. There is also a tag for each commit and its shorthand sha256 value.',
    }
  };

  #json = {};

  #files = {
    workflows:{
      tags:'',
    },
    dockerfile:'',
    build:'',
    readme:'',
    compose:'',
  };

  constructor(opt = {}){
    this.#loadFiles(); // load all files
    this.#parseInputs(opt); // parse all possible inputs
    this.#createVariables(); // create all dynamic and static variables

    this.#header = [
      '![banner](https://github.com/11notes/defaults/blob/main/static/img/banner.png?raw=true)',
      `# \${{ distro_icon }}\${{ json_name }}\r\n${this.#default.content.shields}`,
      this.#json.readme.description,
      this.#default.content.tags,
    ];

    this.#footer = [
      this.#default.content.sarif,
      `# ElevenNotes™️\r\nThis image is provided to you at your own risk. Always make backups before updating an image to a different version. Check the [releases](https://github.com/11notes/docker-${this.#json.name}/releases) for breaking changes. If you have any problems with using this image simply raise an [issue](https://github.com/11notes/docker-${this.#json.name}/issues), thanks. If you have a question or inputs please create a new [discussion](https://github.com/11notes/docker-${this.#json.name}/discussions) instead of an issue. You can find all my other repositories on [github](https://github.com/11notes?tab=repositories).`,
    ];

    this.#create();
  }

  #loadFiles(){
    fs.readdirSync('./').forEach(file => {
      switch(true){
        case /^\.json/i.test(file): this.#json = JSON.parse(fs.readFileSync(file).toString()); this.#jsonToTemplateVariable(this.#json, 'json_'); break;
        case /arch\.dockerfile/i.test(file): this.#files.dockerfile = fs.readFileSync(file).toString(); break;
        case /build\.dockerfile/i.test(file): this.#files.build = fs.readFileSync(file).toString(); break;
        case /project\.md/i.test(file): this.#files.readme = fs.readFileSync(file).toString(); break;
        case /compose\.yaml|compose\.yml/i.test(file): this.#files.compose = fs.readFileSync(file).toString(); break;
        case /\.github/i.test(file):
          if(fs.existsSync('./.github/workflows/tags.yml')){
            this.#files.workflows.tags = fs.readFileSync('./.github/workflows/tags.yml').toString();
          }
        break;
      }
    });

    core.info(`json: ${inspect(this.#json, {showHidden:true, depth:null})}`);
  }

  #CVSS3_1severityToText(severity){
    switch(true){
      case severity <= 0: return('None');
      case severity > 0 && severity <= 3.9: return('Low');
      case severity >= 4 && severity <= 6.9: return('Medium');
      case severity >= 7 && severity <= 8.9: return('High');
      case severity >= 9: return('Critical');
    }
  }

  #parseInputs(opt){
    if(opt?.sarif_file){
      // check and parse for sarif_file
      const sarifPath = path.resolve(opt.sarif_file);
      if(fs.existsSync(sarifPath)){
        const bytes = fs.readFileSync(sarifPath, 'utf-8');
        try{
          const report = [];
          const sarif = JSON.parse(bytes);
          if(Array.isArray(sarif?.runs) && /grype/i.test(sarif?.runs[0]?.tool?.driver?.name)){
            for(const rules of sarif.runs[0].tool.driver?.rules){
              const severity = parseFloat(rules?.properties?.['security-severity']);
              const severityHuman = this.#CVSS3_1severityToText(severity);
              if(severity >= (this.#json?.readme?.grype?.severity || 4)){
                const a = rules?.help?.markdown.split('| --- |\n');
                if(Array.isArray(a) && a.length >= 1){
                  const markdown = a[1];
                  report.push({
                    id:rules.id,
                    severity:severity,
                    markdown:markdown.replace(/^\|\s+(\S+)\s+\|/i, `| ${severity} (${severityHuman}) |`),
                  });
                }else{
                  core.warning(`could not parse sarif rule ${rules.id}`);
                }
              }else{
                core.info(`${rules.id} with severity ${severity} (${severityHuman}) skipped`);
              }
            }
            if(report.length > 0){
              report.sort((a, b) => {return(b.severity - a.severity)});
            }
            if(report.length > 0){
              const markdownTable = [
                '| Severity | Package | Version | Fix Version | Type | Location | Data Namespace | Link |',
                '| --- | --- | --- | --- | --- | --- | --- | --- |',
              ];
              for(const CVE of report){
                markdownTable.push(CVE.markdown);
              }
              this.#default.content.sarif = `${this.#default.title.sarif}\r\n${markdownTable.join("\r\n")}`
            }
          }else{
            core.warning(`could not parse sarif file (not a grype report)`);
          }
        }catch(e){
          core.warning(`could not parse sarif file`);
        }
      }else{
        core.warning(`could not open sarif file at ${sarifPath}`);
      }
    }
  }

  #createVariables(){
    this.#createTags();

    // check for compose example
    if(this.#files.compose.length > 0){
      this.#default.content.compose = `${this.#default.title.compose}\r\n${"```"}yaml\r\n${this.#files.compose}\r\n${"```"}`;
    }

    // check for build example
    if(this.#files.build.length > 0){
      this.#default.content.build = `${this.#default.title.build}\r\n${"```"}yaml\r\n${this.#files.build}\r\n${"```"}`;
    }

    // check for parent image
    this.#env['distro_icon'] = '⛰️ ';
    switch(true){
      case /scratch/i.test(this.#json?.readme?.parent?.image): this.#env['distro_icon'] = ''; this.#env['json_readme_parent_url'] = 'https://hub.docker.com/_/scratch'; break;
      case /11notes\/alpine\:.+/i.test(this.#json?.readme?.parent?.image): this.#env['json_readme_parent_url'] = 'https://hub.docker.com/r/11notes/alpine'; break;
      case /11notes\/kms\:.+/i.test(this.#json?.readme?.parent?.image): this.#env['json_readme_parent_url'] = 'https://hub.docker.com/r/11notes/kms'; break;
      case /ubuntu\:.+/i.test(this.#json?.readme?.parent?.image): this.#env['distro_icon'] = '🍟 '; this.#env['json_readme_parent_url'] = 'https://hub.docker.com/_/ubuntu'; break;
    }

    // check for built
    const built = [];
    for(const k in this.#json?.readme?.built){
      built.push(`* [${k}](${this.#json.readme.built[k]})`);
    }
    if(built.length > 0){
      this.#default.content.built = `${this.#default.title.built}\r\n${built.join("\r\n")}`;
    }

    // finalize
    this.#jsonToTemplateVariable(this.#default);
  }

  #jsonToTemplateVariable(json, prefix = ''){
    for(const k in json){
      if(typeof(json[k]) === 'object'){
        this.#jsonToTemplateVariable(json[k], `${prefix}${k}_`);
      }else{
        this.#env[`${prefix}${k.toLowerCase()}`] = json[k];
      }
    }
  }

  #createTags(){
    let tags = [];
    let hasUnraid = false;
    tags.push(this.#json.semver.version);
    for(const tag in this.#json.semver){
      if(tag !== 'version'){
        switch(true){
          case /stable/i.test(tag): tags.push('stable'); break;
          case /latest/i.test(tag): tags.push('latest'); break;
        }
      }
    }

    // check if image supports unraid tags
    if(/unraid|"uid":"99"/i.test(this.#files.workflows.tags) || /eleven unraid/i.test(this.#files.dockerfile)){
      hasUnraid = true;
      const unraid = [];
      for(const tag of tags){
        unraid.push(`${tag}-unraid`);
      }
      tags = tags.concat(unraid);
    }

    // create tags content
    if(tags.length > 0){
      const list = [];
      for(const tag of tags){
        list.push(`* [${tag}](https://hub.docker.com/r/11notes/${this.#json.name}/tags?name=${tag})`);
      }
      this.#default.content.tags = `${this.#default.title.tags}\r\n${this.#default.text.tags}\r\n\r\n${list.join("\r\n")}`;

      if(hasUnraid){
        this.#default.content.tags += `\r\n\r\n${this.#default.content.unraid}`;
      }
    }
  }

  #create(){
    const output = {
      markdown:'',
      header:[],
      footer:[],
    };

    // header
    for(const e of this.#header){
      if(`${e}`.length > 0){
        output.header.push(e);
      }
    }
    output.markdown += `${output.header.join("\r\n\r\n")}\r\n\r\n`;

    // body
    output.markdown += this.#files.readme;

    // footer
    for(const e of this.#footer){
      if(`${e}`.length > 0){
        output.footer.push(e);
      }
    }
    output.markdown += `\r\n\r\n${output.footer.join("\r\n\r\n")}`;

    for(const k in this.#env){
      output.markdown = output.markdown.replace(new RegExp(`\\\${{ ${String(k).toLowerCase()} }}`, 'ig'), this.#env[k]);
    }

    // include all files
    const includes = [...output.markdown.matchAll(/\${{ include:\s+(\S+) }}/ig)];
    for(const file of includes){
      if(fs.existsSync(file[1])){
        output.markdown = output.markdown.replace(`\${{ include: ${file[1]} }}`, fs.readFileSync(file[1]).toString());
      }else{
        output.markdown = output.markdown.replace(`\${{ include: ${file[1]} }}`,`file ${file[1]} not found!`);
      }
    }

    for(const k in this.#env){
      output.markdown = output.markdown.replace(new RegExp(`\\\${{ ${String(k).toLowerCase()} }}`, 'ig'), this.#env[k]);
    }

    // write file
    fs.writeFileSync('./README.md', output.markdown);
  }
}

try{
  const readme = new README({
    sarif_file:core.getInput('sarif_file') || null,
  });
}catch(err){
  core.error(inspect(err, {showHidden:true, depth:null}));
  core.setFailed(`action failed with error ${err.message}`);
}