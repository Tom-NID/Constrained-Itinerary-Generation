

/*ticks*/ function ticks(t,a,n){let r=[1,2,5];for(var o=function(t,a,n){var o=(a-t)/n,h=Math.log10(o),u=[Math.floor(h),Math.ceil(h)],c=1/0;return r.forEach(function(t){u.forEach(function(a){var n=t*Math.pow(10,a);Math.abs(o-n)<Math.abs(o-c)&&(c=n)})}),c}(t,a,n),h=function(t,a){return Math.floor(t/a)*a}(t,o),u=[h];h<a;)h+=o,u.push(h);return u=u.map(function(t){var a=Math.pow(10,Math.ceil(Math.log10(t))+1);return function(t){return Math.round(t*a)/a}}(o))}
/*byID*/ function byID(elemo){return document.getElementById(elemo)}
/*sel*/ function sel(elemo){return document.querySelector(elemo)}
/*sparkline*/ var sparkline=function(t){var e={};function r(n){if(e[n])return e[n].exports;var o=e[n]={i:n,l:!1,exports:{}};return t[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}return r.m=t,r.c=e,r.d=function(t,e,n){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)r.d(n,o,function(e){return t[e]}.bind(null,o));return n},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=1)}([function(t,e,r){var n=r(2),o=r(3),i=r(4);t.exports=function(t){return n(t)||o(t)||i()}},function(t,e,r){"use strict";r.r(e),r.d(e,"sparkline",function(){return c});var n=r(0),o=r.n(n);function i(t,e,r,n){return parseFloat((e-n*e/t+r).toFixed(2))}function a(t){return t.value}function u(t,e){var r=document.createElementNS("http://www.w3.org/2000/svg",t);for(var n in e)r.setAttribute(n,e[n]);return r}function c(t,e,r){var n;if(n=t,o()(n.querySelectorAll("*")).forEach(function(t){return n.removeChild(t)}),!(e.length<=1)){r=r||{},"number"==typeof e[0]&&(e=e.map(function(t){return{value:t}}));var c=r.onmousemove,l=r.onmouseout,s="interactive"in r?r.interactive:!!c,f=r.spotRadius||2,p=2*f,d=r.cursorWidth||2,v=parseFloat(t.attributes["stroke-width"].value),b=r.fetch||a,h=e.map(function(t){return b(t)}),y=parseFloat(t.attributes.width.value)-2*p,x=parseFloat(t.attributes.height.value),m=x-2*v-p,g=Math.max.apply(Math,o()(h)),A=-1e3,w=h.length-1,j=y/w,k=[],O=i(g,m,v+f,h[0]),S="M".concat(p," ").concat(O);h.forEach(function(t,r){var n=r*j+p,o=i(g,m,v+f,t);k.push(Object.assign({},e[r],{index:r,x:n,y:o})),S+=" L ".concat(n," ").concat(o)});var M=u("path",{class:"sparkline--line",d:S,fill:"none"}),C=u("path",{class:"sparkline--fill",d:"".concat(S," V ").concat(x," L ").concat(p," ").concat(x," Z"),stroke:"none"});if(t.appendChild(C),t.appendChild(M),s){var E=u("line",{class:"sparkline--cursor",x1:A,x2:A,y1:0,y2:x,"stroke-width":d}),_=u("circle",{class:"sparkline--spot",cx:A,cy:A,r:f});t.appendChild(E),t.appendChild(_);var F=u("rect",{width:t.attributes.width.value,height:t.attributes.height.value,style:"fill: transparent; stroke: transparent",class:"sparkline--interaction-layer"});t.appendChild(F),F.addEventListener("mouseout",function(t){E.setAttribute("x1",A),E.setAttribute("x2",A),_.setAttribute("cx",A),l&&l(t)}),F.addEventListener("mousemove",function(t){var e=t.offsetX,r=k.find(function(t){return t.x>=e});r||(r=k[w]);var n,o=k[k.indexOf(r)-1],i=(n=o?o.x+(r.x-o.x)/2<=e?r:o:r).x,a=n.y;_.setAttribute("cx",i),_.setAttribute("cy",a),E.setAttribute("x1",i),E.setAttribute("x2",i),c&&c(t,n)})}}}e.default=c},function(t,e){t.exports=function(t){if(Array.isArray(t)){for(var e=0,r=new Array(t.length);e<t.length;e++)r[e]=t[e];return r}}},function(t,e){t.exports=function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}},function(t,e){t.exports=function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}}]);
/*polyline*/ var polyline={};function py2_round(value){return Math.floor(Math.abs(value)+0.5)*(value>=0?1:-1)} function encode(current,previous,factor){current=py2_round(current*factor);previous=py2_round(previous*factor);var coordinate=current-previous;coordinate<<=1;if(current-previous<0){coordinate=~coordinate} var output='';while(coordinate>=0x20){output+=String.fromCharCode((0x20|(coordinate&0x1f))+63);coordinate>>=5} output+=String.fromCharCode(coordinate+63);return output} polyline.decode=function(str,precision){var index=0,lat=0,lng=0,coordinates=[],shift=0,result=0,byte=null,latitude_change,longitude_change,factor=Math.pow(10,Number.isInteger(precision)?precision:5);while(index<str.length){byte=null;shift=0;result=0;do{byte=str.charCodeAt(index++)-63;result|=(byte&0x1f)<<shift;shift+=5}while(byte>=0x20);latitude_change=((result&1)?~(result>>1):(result>>1));shift=result=0;do{byte=str.charCodeAt(index++)-63;result|=(byte&0x1f)<<shift;shift+=5}while(byte>=0x20);longitude_change=((result&1)?~(result>>1):(result>>1));lat+=latitude_change;lng+=longitude_change;coordinates.push([lat/factor,lng/factor])} return coordinates};polyline.encode=function(coordinates,precision){if(!coordinates.length){return''} var factor=Math.pow(10,Number.isInteger(precision)?precision:5),output=encode(coordinates[0][0],0,factor)+encode(coordinates[0][1],0,factor);for(var i=1;i<coordinates.length;i++){var a=coordinates[i],b=coordinates[i-1];output+=encode(a[0],b[0],factor);output+=encode(a[1],b[1],factor)} return output};function flipped(coords){var flipped=[];for(var i=0;i<coords.length;i++){var coord=coords[i].slice();flipped.push([coord[1],coord[0]])} return flipped} polyline.fromGeoJSON=function(geojson,precision){if(geojson&&geojson.type==='Feature'){geojson=geojson.geometry} if(!geojson||geojson.type!=='LineString'){throw new Error('Input must be a GeoJSON LineString')} return polyline.encode(flipped(geojson.coordinates),precision)};polyline.toGeoJSON=function(str,precision){var coords=polyline.decode(str,precision);return{type:'LineString',coordinates:flipped(coords)}};
// suncalc
!function(n){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=n();else if("function"==typeof define&&define.amd)define([],n);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).suncalc=n()}}(function(){return function(){return function n(t,e,r){function o(i,a){if(!e[i]){if(!t[i]){var c="function"==typeof require&&require;if(!a&&c)return c(i,!0);if(u)return u(i,!0);var f=new Error("Cannot find module '"+i+"'");throw f.code="MODULE_NOT_FOUND",f}var d=e[i]={exports:{}};t[i][0].call(d.exports,function(n){return o(t[i][1][n]||n)},d,d.exports,n,t,e,r)}return e[i].exports}for(var u="function"==typeof require&&require,i=0;i<r.length;i++)o(r[i]);return o}}()({1:[function(n,t,e){!function(){"use strict";var n=Math.PI,r=Math.sin,o=Math.cos,u=Math.tan,i=Math.asin,a=Math.atan2,c=Math.acos,f=n/180,d=864e5,s=2440588,l=2451545;function h(n){return new Date((n+.5-s)*d)}function M(n){return function(n){return n.valueOf()/d-.5+s}(n)-l}var p=23.4397*f;function v(n,t){return a(r(n)*o(p)-u(t)*r(p),o(n))}function g(n,t){return i(r(t)*o(p)+o(t)*r(p)*r(n))}function w(n,t,e){return a(r(n),o(n)*r(t)-u(e)*o(t))}function m(n,t,e){return i(r(t)*r(e)+o(t)*o(e)*o(n))}function y(n,t){return f*(280.16+360.9856235*n)-t}function D(n){return f*(357.5291+.98560028*n)}function b(t){return t+f*(1.9148*r(t)+.02*r(2*t)+3e-4*r(3*t))+102.9372*f+n}function x(n){var t=b(D(n));return{dec:g(t,0),ra:v(t,0)}}var P={getPosition:function(n,t,e){var r=f*-e,o=f*t,u=M(n),i=x(u),a=y(u,r)-i.ra;return{azimuth:w(a,o,i.dec),altitude:m(a,o,i.dec)}}},q=P.times=[[-.833,"sunrise","sunset"],[-.3,"sunriseEnd","sunsetStart"],[-6,"dawn","dusk"],[-12,"nauticalDawn","nauticalDusk"],[-18,"nightEnd","night"],[6,"goldenHourEnd","goldenHour"]];P.addTime=function(n,t,e){q.push([n,t,e])};var E=9e-4;function O(t,e,r){return E+(t+e)/(2*n)+r}function T(n,t,e){return l+n+.0053*r(t)-.0069*r(2*e)}function H(n,t,e,u,i,a,f){return T(O(function(n,t,e){return c((r(n)-r(t)*r(e))/(o(t)*o(e)))}(n,e,u),t,i),a,f)}function U(n){var t=f*(134.963+13.064993*n),e=f*(93.272+13.22935*n),u=f*(218.316+13.176396*n)+6.289*f*r(t),i=5.128*f*r(e),a=385001-20905*o(t);return{ra:v(u,i),dec:g(u,i),dist:a}}function C(n,t){return new Date(n.valueOf()+t*d/24)}P.getTimes=function(t,e,r){var o,u,i,a,c,d=f*-r,s=f*e,l=function(t,e){return Math.round(t-E-e/(2*n))}(M(t),d),p=O(0,d,l),v=D(p),w=b(v),m=g(w,0),y=T(p,v,w),x={solarNoon:h(y),nadir:h(y-.5)};for(o=0,u=q.length;o<u;o+=1)c=y-((a=H((i=q[o])[0]*f,d,s,m,l,v,w))-y),x[i[1]]=h(c),x[i[2]]=h(a);return x},P.getMoonPosition=function(n,t,e){var i=f*-e,c=f*t,d=M(n),s=U(d),l=y(d,i)-s.ra,h=m(l,c,s.dec),p=a(r(l),u(c)*o(s.dec)-r(s.dec)*o(l));return h+=function(n){return n<0&&(n=0),2967e-7/Math.tan(n+.00312536/(n+.08901179))}(h),{azimuth:w(l,c,s.dec),altitude:h,distance:s.dist,parallacticAngle:p}},P.getMoonIllumination=function(n){var t=M(n||new Date),e=x(t),u=U(t),i=c(r(e.dec)*r(u.dec)+o(e.dec)*o(u.dec)*o(e.ra-u.ra)),f=a(149598e3*r(i),u.dist-149598e3*o(i)),d=a(o(e.dec)*r(e.ra-u.ra),r(e.dec)*o(u.dec)-o(e.dec)*r(u.dec)*o(e.ra-u.ra));return{fraction:(1+o(f))/2,phase:.5+.5*f*(d<0?-1:1)/Math.PI,angle:d}},P.getMoonTimes=function(n,t,e,r){var o=new Date(n);r?o.setUTCHours(0,0,0,0):o.setHours(0,0,0,0);for(var u,i,a,c,d,s,l,h,M,p,v,g,w,m=.133*f,y=P.getMoonPosition(o,t,e).altitude-m,D=1;D<=24&&(u=P.getMoonPosition(C(o,D),t,e).altitude-m,h=((d=(y+(i=P.getMoonPosition(C(o,D+1),t,e).altitude-m))/2-u)*(l=-(s=(i-y)/2)/(2*d))+s)*l+u,p=0,(M=s*s-4*d*u)>=0&&(v=l-(w=Math.sqrt(M)/(2*Math.abs(d))),g=l+w,Math.abs(v)<=1&&p++,Math.abs(g)<=1&&p++,v<-1&&(v=g)),1===p?y<0?a=D+v:c=D+v:2===p&&(a=D+(h<0?g:v),c=D+(h<0?v:g)),!a||!c);D+=2)y=i;var b={};return a&&(b.rise=C(o,a)),c&&(b.set=C(o,c)),a||c||(b[h>0?"alwaysUp":"alwaysDown"]=!0),b},"object"==typeof e&&void 0!==t?t.exports=P:window.SunCalc=P}()},{}]},{},[1])(1)});

export function addSparkline(containerId, path, useGradient, units, kmDistance, map){
  let dataValues = [];
  let dataPath = [];
  let layer = L.layerGroup().addTo(map);
  map.addLayer(layer);
  
  path.path.forEach(value => {
    if (value.alt) {
      dataValues.push(value.alt);
      dataPath.push(value);
    } 
  });
  
  let minVal = Math.min(...dataValues)
  let maxVal = Math.max(...dataValues)
  window.addEventListener('resize', function handler() {
    addSparkline(containerId, dataValues, useGradient)
    this.removeEventListener('resize', handler)
  })
  
  function findClosest(target, tagName) {
    if (target.tagName === tagName) {
      return target;
    }
    
    while ((target = target.parentNode)) {
      if (target.tagName === tagName) {
        break;
      }
    }
    
    return target;
  }
  
  let onmousemove = null, scaledDataValues, onmouseout = function(){
    byID(containerId + "Tooltip").classList.add("hide");
    layer.clearLayers();
  }
  
  onmousemove = function(event, datapoint){
    var svg = findClosest(event.target, "svg");
    var tooltip = svg.nextElementSibling;
    
    let average1 = dataValues.slice(datapoint.index, datapoint.index + 2)
    average1 = average1.reduce((partial_sum, a) => partial_sum + a, 0)/average1.length;
    
    let average2 = dataValues.slice(datapoint.index-2, datapoint.index)
    average2 = average2.reduce((partial_sum, a) => partial_sum + a, 0)/average2.length;
    
    let grade = ((dataValues[datapoint.index] - dataValues[datapoint.index-1])/25)*100
    tooltip.classList.remove("hide");
    if (dataValues[datapoint.index]) {
      tooltip.innerHTML = `<b>${grade.toFixed(0)}% grade</b><br>${(dataValues[datapoint.index]).toFixed(0)} meters`;
    } else {
      tooltip.innerHTML = '???';
    }
    tooltip.style.top = `${event.pageY}px`;
    tooltip.style.left = `${event.pageX + 20}px`;
    if (window.innerWidth < 600) tooltip.style.left = `${Math.min(window.innerWidth-236, event.pageX+20) + 20}px`;
    
    layer.clearLayers();
    map.addLayer(layer);
    L.circle([dataPath[datapoint.index].lat, dataPath[datapoint.index].lon] , {radius: 2, color: "blue"}).addTo(layer);
  }
  
  let up = 0
  let down = 0
  for (let i=0; i<dataValues.length-1; i++){
    let diff = dataValues[i+1] - dataValues[i]
    if (diff > 0){
      up = up + diff
    } else {
      down = down + (diff*-1)
    }
  }
  
  scaledDataValues = dataValues.map(v=> v-minVal)
  if (maxVal - minVal < 50){
    scaledDataValues = dataValues.map(v=> v+30)
  }
  
  // resize svg to be 100% of chart container
  let parent = byID(containerId + "Chart")
  let child = byID(containerId)
  
  child.setAttribute("height", "40")
  child.setAttribute("width", parent.offsetWidth + 4)
  child.setAttribute("stroke-width", 3)
  
  child.innerHTML = ""
  sparkline.sparkline(child, scaledDataValues, {onmousemove, onmouseout})
  
  addTicks(kmDistance, units, containerId + "Axis")
  
  function addTicks(lengthOfRoute, lengthUnits, tickContainer){
    let tickIntervals = ticks(0, lengthOfRoute, 3)
    if (tickIntervals[tickIntervals.length-1] != lengthOfRoute){
      tickIntervals.pop()
    }
    
    tickContainer = document.getElementById(tickContainer)
    tickContainer.innerHTML = ""
    
    let borderLine = document.createElement("div")
    borderLine.classList.add("borderLine")
    tickContainer.appendChild(borderLine)
    
    // ticks themeselves
    let tickMarks = document.createElement("div")
    tickMarks.classList.add("ticks")
    let tickLabels = document.createElement("div")
    tickLabels.classList.add("tickLabels")
    
    for (let i=0; i<tickIntervals.length; i++){
      let tickMark = document.createElement("div")
      tickMark.classList.add("tick")
      tickMark.style.left = ((tickIntervals[i]/lengthOfRoute)*100).toFixed(2) + "%"
      tickMarks.appendChild(tickMark)
      
      let tickLabel = document.createElement("div")
      tickLabel.classList.add("tickLabel")
      tickLabel.innerText = tickIntervals[i] + " " + lengthUnits
      
      if (i === 0){
        tickLabel.style.left = ((tickIntervals[i]/lengthOfRoute)*100).toFixed(2) + "%;"
      } else if (i == tickIntervals.length-1 && (tickIntervals[tickIntervals.length -1] == lengthOfRoute || tickIntervals[tickIntervals.length-1]/lengthOfRoute > 0.96)){
        tickLabel.style.right = 0
        tickLabel.style.whiteSpace = "nowrap" 
      } else {
        tickLabel.style.whiteSpace = "nowrap"
        tickLabel.style.transform = "translateX(-50%)"
        tickLabel.style.left = ((tickIntervals[i]/lengthOfRoute)*100).toFixed(2) + "%"
      }
      
      tickLabels.appendChild(tickLabel)
    }
    
    tickContainer.appendChild(tickMarks)
    tickContainer.appendChild(tickLabels)
  }
}