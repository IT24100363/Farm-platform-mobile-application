import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const DEFAULT_CENTER = {
  latitude: 6.9271,
  longitude: 79.8612
};

export default function LocationPickerMap({
  selectedLocation,
  onTap,
  onReady,
  defaultCenter = DEFAULT_CENTER,
  height = 320
}) {
  const webViewRef = useRef(null);
  const [ready, setReady] = useState(false);

  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #f4f8f5; }
    .leaflet-container { font-family: Arial, sans-serif; }
    .leaflet-control-attribution { font-size: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const center = [${defaultCenter.latitude}, ${defaultCenter.longitude}];
    const map = L.map('map', { zoomControl: true }).setView(center, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker = null;
    let markerLabel = '';

    const send = (payload) => {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    };

    const setMarker = (lat, lng, label, zoomLevel) => {
      const point = [lat, lng];
      if (marker) {
        marker.setLatLng(point);
      } else {
        marker = L.marker(point).addTo(map);
      }
      markerLabel = label || markerLabel || 'Selected location';
      marker.bindPopup(markerLabel).openPopup();
      if (zoomLevel) {
        map.setView(point, zoomLevel);
      } else {
        map.panTo(point);
      }
    };

    window.__receiveCommand = function(command) {
      if (!command || !command.type) return;
      if (command.type === 'setLocation') {
        setMarker(command.latitude, command.longitude, command.label || 'Selected location', command.zoom || 16);
      }
    };

    map.on('click', function(event) {
      const lat = event.latlng.lat;
      const lng = event.latlng.lng;
      setMarker(lat, lng, 'Selected location', 16);
      send({ type: 'tap', latitude: lat, longitude: lng });
    });

    send({ type: 'ready' });
  </script>
</body>
</html>`,
    [defaultCenter.latitude, defaultCenter.longitude]
  );

  const sendCommand = (command) => {
    if (!webViewRef.current) return;
    const serialized = JSON.stringify(command).replace(/\\/g, '\\\\').replace(/`/g, '\\`');
    webViewRef.current.injectJavaScript(`window.__receiveCommand(${serialized}); true;`);
  };

  useEffect(() => {
    if (!ready || !selectedLocation?.latitude || !selectedLocation?.longitude) return;
    sendCommand({
      type: 'setLocation',
      latitude: Number(selectedLocation.latitude),
      longitude: Number(selectedLocation.longitude),
      label: selectedLocation.label || selectedLocation.address || 'Selected location',
      zoom: 16
    });
  }, [ready, selectedLocation?.latitude, selectedLocation?.longitude, selectedLocation?.label, selectedLocation?.address]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setReady(true);
        onReady?.();
        return;
      }
      if (data.type === 'tap') {
        onTap?.({
          latitude: Number(data.latitude),
          longitude: Number(data.longitude)
        });
      }
    } catch (error) {
      // ignore malformed messages
    }
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: 'hidden'
  },
  webView: {
    backgroundColor: '#f4f8f5'
  }
});
