const apiBaseURL = 'https://api.github.com';
const downloadURL = 'https://raw.githubusercontent.com';

const app = new Vue({
  el: '#app',
  data: {
    messages: [],
    packages: {},
    total: 0,
    scaleFactor: 3,
    finished: false
  },
  methods: {
    handleSubmit,
    drawCloud,
    addPackage: function(e) {
      Vue.set(
        this.packages,
        e.target.package.value,
        Number(e.target.count.value)
      );
      e.target.reset();
    },
    updatePackage: function(val, key) {
      this.packages[key] = Number(val);
    },
    save: function(format) {
      const xml = new XMLSerializer().serializeToString(
        document.querySelector('#cloud > svg')
      );
      const svg = new Blob([xml], {
        type: 'image/svg+xml;charset=utf-8'
      });
      const url = URL.createObjectURL(svg);

      if (format === 'svg') {
        const dl = document.createElement('a');
        dl.download = 'package-cloud.svg';
        dl.href = url;
        dl.click();
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      const img = document.createElement('img');
      img.setAttribute('src', url);
      img.onload = () => {
        ctx.drawImage(img, 0, 0);

        const dl = document.createElement('a');
        dl.download = 'package-cloud.png';
        dl.href = canvas.toDataURL('image/png');
        dl.click();
      };
    }
  },
  mounted: function() {
    const parts = window.location.href.split('#');
    if (parts.length > 1) {
      const input = document.getElementById('handle');
      input.value = parts[1];
      this.handleSubmit({ target: input });
    }
  }
});

async function handleSubmit(e) {
  e.target.blur();
  const handle = e.target.value.trim();
  window.location.href = window.location.href.split('#')[0] + `#${handle}`

  this.finished = false;
  this.packages = {};
  this.messages = [];
  d3.select('#cloud').html(null);

  const messages = this.messages;
  const packages = this.packages;

  try {
    messages.push({
      text: `Loading ${handle}'s repositories`,
      class: 'loading'
    });
    let data = [];
    let pageNo = 1;
    let page;
    while (!page || page.length !== 0) {
      page = await (await fetch(
        apiBaseURL + `/users/${handle}/repos?page=${pageNo}`
      )).json();
      if (page.message) throw Error(page.message);
      data = data.concat(page);
      pageNo++;
    }
    messages[messages.length - 1].class = 'success';
    messages.push({
      text: `Fetched list of ${data.length} repositories`,
      class: 'info'
    });
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      try {
        messages.push({
          text: `Looking for <i>packages.json</i> in <i>${r.name}</i>`,
          class: 'loading'
        });
        const packageJSON = await (await fetch(
          downloadURL + `/${handle}/${r.name}/master/package.json`
        )).json();
        let count = 0;
        Object.keys(packageJSON.dependencies).forEach(d => {
          Vue.set(packages, d, (packages[d] || 0) + 1);
          count++;
        });
        if (packageJSON.devDependencies) {
          Object.keys(packageJSON.devDependencies).forEach(d => {
            Vue.set(packages, d, (packages[d] || 0) + 1);
            count++;
          });
        }
        messages[messages.length - 1].class = 'success';
        messages.push({
          text: `Found <b>${count}</b> pacakges in <b>${r.name}</b>`,
          class: 'success'
        });
      } catch (e) {
        messages.push({
          text: `<i>packages.json</i> not found in <i>${r.name}</i>`,
          class: 'warning'
        });
      }
    }
    this.messages = [];
    this.drawCloud();
  } catch (e) {
    messages[messages.length - 1].class = 'finished';
    const message = e.text;
    messages.push({
      text: `User with handle <b>${handle}</b> not found`,
      class: 'error'
    });
  }
}

function drawCloud() {
  const words = Object.keys(this.packages).map(k => [k, this.packages[k]]);
  const sum = words.reduce((s, w) => s + w[1], 0);

  const height = 480;
  const layout = d3.layout
    .cloud()
    .size([height * 1.5, height])
    .words(
      words.map(([key, val]) => ({
        text: key,
        size: val / sum * height * this.scaleFactor
      }))
    )
    .padding(1)
    .font('Impact')
    .rotate(0)
    .spiral('archimedean')
    .fontSize(function(d) {
      return d.size;
    })
    .on('end', words => {
      const fill = d3.scaleOrdinal(d3.schemeCategory10);
      d3
        .select('#cloud')
        .html(null)
        .append('svg')
        .attr('width', layout.size()[0])
        .attr('height', layout.size()[1])
        .append('g')
        .attr(
          'transform',
          'translate(' + layout.size()[0] / 2 + ',' + layout.size()[1] / 2 + ')'
        )
        .selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .style('font-size', function(d) {
          return d.size + 'px';
        })
        .style('font-family', 'Impact')
        .style('fill', function(t) {
          return fill(t.text);
        })
        .attr('text-anchor', 'middle')
        .attr('transform', function(d) {
          return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
        })
        .text(function(d) {
          return d.text;
        });
      d3
        .select('#cloud > svg')
        .append('text')
        .attr('text-anchor', 'end')
        .attr('x', 720)
        .attr('y', 475)
        .attr('fill', '#2c3e50')
        .style('font-size', 10)
        .html('https://sjsakib.github.io/package-cloud');
      this.finished = true;
    });

  layout.start();
}
