import './main.scss';

import esri = __esri;

// esri config and auth
import esriConfig from '@arcgis/core/config';

// map, view and layers
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Basemap from '@arcgis/core/Basemap';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import PopupTemplate from '@arcgis/core/PopupTemplate';
import SearchViewModel from '@arcgis/core/widgets/Search/SearchViewModel';
import LayerSearchSource from '@arcgis/core/widgets/Search/LayerSearchSource';

// layout
import ActionPadLayout from '@vernonia/core/dist/layouts/ActionPadLayout';
import '@vernonia/core/dist/layouts/Layout.css';

// config portal and auth
esriConfig.portalUrl = 'https://gis.vernonia-or.gov/portal';

// app config and init loading screen
const title = 'Vernonia Addresses';

const globalId = new URL(document.location.href).searchParams.get('id');

const addresses = new FeatureLayer({
  url: 'https://gis.vernonia-or.gov/server/rest/services/LandUse/Land_Use/MapServer/5',
  outFields: ['*'],
  popupTemplate: new PopupTemplate({
    title: '{FullAddress}',
    content: (event: { graphic: esri.Graphic }): string => {
      const { PrimarySitus, SitusAddress, Latitude, Longitude, GlobalID } = event.graphic.attributes;
      return `
        <table class="esri-widget__table">
          <tr>
            <th class="esri-feature__field-header">Primary Situs</th>
            <td class="esri-feature__field-data">${PrimarySitus}</td>
          </tr>
          <tr>
            <th class="esri-feature__field-header">Situs Address</th>
            <td class="esri-feature__field-data">${SitusAddress}</td>
          </tr>
          <tr>
            <th class="esri-feature__field-header">Latitude</th>
            <td class="esri-feature__field-data">${Latitude}</td>
          </tr>
          <tr>
            <th class="esri-feature__field-header">Longitude</th>
            <td class="esri-feature__field-data">${Longitude}</td>
          </tr>
          <tr>
            <th class="esri-feature__field-header">Id</th>
            <td class="esri-feature__field-data">${GlobalID.replace('{', '&lcub;').replace('}', '&rcub;')}</td>
          </tr>
        <table>
      `;
    },
  }),
});

// view
const view = new MapView({
  map: new Map({
    basemap: new Basemap({
      portalItem: {
        id: '2622b9aecacd401583981410e07d5bb9',
      },
    }),
    layers: [
      new FeatureLayer({
        portalItem: {
          id: '0df1d0d9f7aa45099881c6de540950c8',
        },
      }),
      new FeatureLayer({
        portalItem: {
          id: '5e1e805849ac407a8c34945c781c1d54',
        },
      }),
      addresses,
    ],
    ground: 'world-elevation',
  }),
  zoom: 14,
  center: [-123.18291178267039, 45.8616094153766],
  constraints: {
    rotationEnabled: false,
  },
  popup: {
    dockEnabled: true,
    dockOptions: {
      position: 'bottom-left',
      breakpoint: false,
    },
  },
});

new ActionPadLayout({
  view,
  loaderOptions: {
    title,
  },
  includeDisclaimer: true,
  includeHeading: true,
  headingOptions: {
    // title,
    logoUrl: 'city_logo_small_white.svg',
    searchViewModel: new SearchViewModel({
      includeDefaultSources: false,
      sources: [
        new LayerSearchSource({
          layer: addresses,
          outFields: ['*'],
          searchFields: ['Address'],
          suggestionTemplate: '{Address}, Vernonia, OR 97064',
          placeholder: 'Search addresses',
          zoomScale: 1120,
        }),
      ],
    }),
  },
  viewControlOptions: {
    includeFullscreen: true,
    includeLocate: true,
  },
  widgetInfos: [],
});

view.when(async () => {
  if (!globalId) return;

  const query = await addresses.queryFeatures({
    where: `GlobalID = '${globalId}'`,
    outFields: ['*'],
    returnGeometry: true,
  });

  if (!query.features || !query.features[0]) return;

  view.popup.open({
    features: [query.features[0]],
  });

  view.goTo(query.features[0].geometry);

  view.scale = 1120;
});
