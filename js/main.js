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
    drawCloud
  }
});

async function handleSubmit(e) {
  const handle = e.target.value.trim();

  this.packages = {};
  this.messages = [];
  d3.select('#cloud').html(null);

  const messages = this.messages;
  const packages = this.packages;

  try {
    messages.push({
      text: `Loading ${handle}'s repositories....`,
      class: 'loading'
    });
    const data = await (await fetch(
      apiBaseURL + `/users/${handle}/repos`
    )).json();
    if (data.message) throw Error(data.message);
    messages[messages.length - 1].class = 'success';
    messages.push({
      text: `Fetched list of ${data.length} repositories....`,
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
        console.log(e);
        messages.push({
          text: `<i>packages.json</i> not found in <i>${r.name}</i>`,
          class: 'warning'
        });
      }
    }
  } catch (e) {
    messages[messages.length - 1].class = 'finished';
    messages.push({
      text: `<b>${handle}</b> not found`,
      class: 'error'
    });
  }
  this.messages = [];
  this.drawCloud();
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
      this.finished = true;
    });

  layout.start();
}
