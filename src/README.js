const Eleven = require('./Eleven.js');
const Grype = require('./Grype.js');
const Inputs = require('./Inputs.js');
const markdownCVE = require('./markdownCVE.js');

const core = require('@actions/core');
const { readdirSync, readFileSync, writeFileSync, existsSync } = require('node:fs');

module.exports = class README{
  #inputs = {};
  #files = {
    workflows:{
      tags:'',
    },
    dockerfile:'',
    build:'',
    readme:'',
    compose:'',
  };
  #env = {};
  #json = {};
  #header = [];
  #footer = [];

  constructor(){

  }

  async init(){
    try{
      Eleven.debug(`current workdir is ${__dirname}`);

      if(core.getInput('development')){
        Eleven.environment('development');
      }

      const inputs = {
        sarif_file:{value:'', debug:'report.sarif'},
        build_output_metadata:{value:'{}', debug:null},
      };

      for(const input in inputs){
        if(core.getInput(input) || Eleven.debug){
          if(typeof(Inputs[input]) === 'function'){
            if(Eleven.debug && existsSync('.development')){
              inputs[input].value = inputs[input].debug;
            }else{
              inputs[input].value = core.getInput(input);
            }
            this.#inputs[input] = await Inputs[input].apply(this, [inputs[input].value]);
          }else{
            Eleven.info(`input ${input} is not a valid function!`);
          }
        }else{
          Eleven.info(`input ${input} is not set!`);
        }
      }

      this.#loadImageFiles();
      await this.#setupEnvironment();
      this.#create();
    }catch(e){
      Eleven.error(`Exception occured! ${e}`);
      Eleven.debug(e);
    }
  }

  #loadImageFiles(){
    readdirSync('./').forEach(file => {
      switch(true){
        case /^\.json/i.test(file):
          this.#json = JSON.parse(readFileSync(file).toString());
          this.#jsonToTemplateVariable(this.#json, 'json_');
          break;

        case /arch\.dockerfile/i.test(file):
          this.#files.dockerfile = readFileSync(file).toString();
          break;

        case /build\.dockerfile/i.test(file):
          this.#files.build = readFileSync(file).toString();
          break;

        case /project\.md/i.test(file):
          this.#files.readme = readFileSync(file).toString();
          break;

        case /compose\.yaml|compose\.yml/i.test(file):
          this.#files.compose = readFileSync(file).toString();
          break;

        case /\.github/i.test(file):
          if(existsSync('./.github/workflows/tags.yml')){
            this.#files.workflows.tags = readFileSync('./.github/workflows/tags.yml').toString();
          }
          break;
      }
    });
  }

  async #setupEnvironment(){

    try{
      //await Grype.init();
    }catch(e){
      Eleven.info(e);
    }

    if(this.#json?.readme?.grype?.severity > 0){
      Grype.cutoff = this.#json.readme.grype.severity;
      Eleven.debug(`set grype markdown cutoff to ${Grype.cutoff}`);
    }
    
    if(this.#inputs.sarif_file && this.#inputs.sarif_file.length > 0){
      Eleven.debug(`create markdownCVE for sarif_file with ${this.#inputs.sarif_file.length} CVEs`);
      const report = new markdownCVE({
        title:etc.title.sarif,
        CVEs:this.#inputs.sarif_file,
      });
      etc.content.sarif = report.create();
    }

    if(this.#inputs.build_output_metadata && this.#inputs.build_output_metadata.length > 0){
      const CVEs = [];
      const matches = [...this.#inputs.build_output_metadata.matchAll(/"type":"FIX","msg":"CVE\|(\S+)\|(\S+)"/ig)];
      for(const match of matches){
        if(/amd64/ig.test(match[2])){
          if(!CVEs.includes(match[1])){
            CVEs.push(match[1]);
          }
        }
      }

      Eleven.debug(`create markdownCVE for build_output_metadata with ${CVEs.length} CVEs`);
      const report = new markdownCVE({
        title:etc.title.patches,
        text:etc.text.patches,
        CVEs:CVEs,
      });

      etc.content.patches = report.create();
    }

    this.#tags();

    // check for compose example
    if(this.#files.compose.length > 0){
      etc.content.compose = `${etc.title.compose}\r\n${"```"}yaml\r\n${this.#files.compose}\r\n${"```"}`;
    }

    // check for build example
    if(this.#files.build.length > 0){
      etc.content.build = `${etc.title.build}\r\n${"```"}yaml\r\n${this.#files.build}\r\n${"```"}`;
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
      etc.content.built = `${etc.title.built}\r\n${built.join("\r\n")}`;
    }

    // finalize env
    this.#jsonToTemplateVariable(etc);

    // setup readme
    this.#header = [
      '![banner](https://github.com/11notes/defaults/blob/main/static/img/banner.png?raw=true)',
      `# \${{ distro_icon }}\${{ json_name }}\r\n${etc.content.shields}`,
      this.#json.readme.description,
      etc.content.tags,
    ];

    this.#footer = [
      etc.content.patches,
      etc.content.sarif,
      `# ElevenNotes™️\r\nThis image is provided to you at your own risk. Always make backups before updating an image to a different version. Check the [releases](https://github.com/11notes/docker-${this.#json.name}/releases) for breaking changes. If you have any problems with using this image simply raise an [issue](https://github.com/11notes/docker-${this.#json.name}/issues), thanks. If you have a question or inputs please create a new [discussion](https://github.com/11notes/docker-${this.#json.name}/discussions) instead of an issue. You can find all my other repositories on [github](https://github.com/11notes?tab=repositories).`,
      `*created ${new Date().toLocaleString('de-CH', {timeZone:'Europe/Zurich'})} (CET)*`,
    ];
  }

  #tags(){
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
      etc.content.tags = `${etc.title.tags}\r\n${etc.text.tags}\r\n\r\n${list.join("\r\n")}`;

      if(hasUnraid){
        Eleven.info('add UNRAID to README.md');
        etc.content.tags += `\r\n\r\n${etc.content.unraid}`;
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
      if(existsSync(file[1])){
        output.markdown = output.markdown.replace(`\${{ include: ${file[1]} }}`, readFileSync(file[1]).toString());
      }else{
        output.markdown = output.markdown.replace(`\${{ include: ${file[1]} }}`,`file ${file[1]} not found!`);
      }
    }

    // add images
    const images = [...output.markdown.matchAll(/\${{ image:\s+(\S+) }}/ig)];
    for(const file of images){
      if(existsSync(`./img/${file[1]}`)){
        output.markdown = output.markdown.replace(`\${{ image: ${file[1]} }}`, `![${file[1].split('.')[0].toUpperCase()}](https://github.com/11notes/docker-${this.#json.name}/blob/master/img/${file[1]}?raw=true)`);
      }else{
        output.markdown = output.markdown.replace(`\${{ image: ${file[1]} }}`,`image ${file[1]} not found!`);
      }
    }

    for(const k in this.#env){
      output.markdown = output.markdown.replace(new RegExp(`\\\${{ ${String(k).toLowerCase()} }}`, 'ig'), this.#env[k]);
    }

    // write file
    if(!existsSync('.development')){
      Eleven.info('writing updated README.md');
      writeFileSync('./README.md', output.markdown);
    }else if(Eleven.get('debug')){
      Eleven.debug('writing updated debug TREADME.md');
      writeFileSync('./TREADME.md', output.markdown);
    }
  }


  // helper functions
  #jsonToTemplateVariable(json, prefix = ''){
    for(const k in json){
      if(typeof(json[k]) === 'object'){
        this.#jsonToTemplateVariable(json[k], `${prefix}${k}_`);
      }else{
        this.#env[`${prefix}${k.toLowerCase()}`] = json[k];
      }
    }
  }
}

const etc = {
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
    patches:'',
  },
  text:{
    tags:'These are the main tags for the image. There is also a tag for each commit and its shorthand sha256 value.',
    patches:"Unlike other popular image providers, this image contains individual CVE fixes to create a clean container image even if the developers of the original app simply forgot or refuse to do that. Why not add a PR with these fixes? Well, many developers ignore PR for CVE fixes and don’t run any code security scanners against their repos. Some simply don’t care.\r\n\r\n",
  }
};