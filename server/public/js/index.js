(function() {
  if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
  } else {
    var container = document.getElementById('container');
    var globe = new Globe(container);
    var socket = io.connect(window.location.href);
    //  on cords report
    socket.on('latlng', function(data) {
      $('.conStat').html('connected');
      $('.twitRate').html(data.rate +' twits/sec');
      var c = new THREE.Color();
      c.setHSV(0.55, 1.0, 1.0);
      globe.addPoint(data.lat, data.lng, data.size, c);
    });

    //  on stats report
    socket.on('stats', function(stats) {
    
      $('.totTwit').html(stats.count);
      $('.coordTwits').html(stats.withGeo);
     
    
      //  formated data for rendering
      var formatedData = [];
      for (var i = stats.countryCount.length - 1; i >= 0; i--) {
        var currentCountry = stats.countryCount[i];
        formatedData.push({
          name: currentCountry.name,
          count: currentCountry.count
        });
      }
      var countryHTML = Mustache.to_html(page.templates.countries, {
        countryCount: formatedData
      });
      $('.countryList').html(countryHTML);
    });
    // socket.on('wordlist', function(wordlistResult) {
    //   console.log(wordlistResult);
    // });
    globe.animate();
  }

  var page = {
    templates: {
      countries: "<br />Total Twits By Country:<br /><ul class='countryList'>{{#countryCount}}<li><b>{{name}}</b> : {{count}}</li>{{/countryCount}}</ul>"
    }
  };
})(document);