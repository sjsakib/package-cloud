const app = new Vue({
  el: '#app',
  data: {
    messages: ['Hi!']
  },
  methods: {
    handleSubmit: function(e) {
      const handle = e.target.value.trim();
      console.log(handle);
    }
  }
});
  