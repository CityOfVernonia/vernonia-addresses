import './main.scss';

// import esri = __esri;

// esri config and auth
import esriConfig from '@arcgis/core/config';

// map, view and layers
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Basemap from '@arcgis/core/Basemap';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { SimpleFillSymbol } from '@arcgis/core/symbols';
import SearchViewModel from '@arcgis/core/widgets/Search/SearchViewModel';
import LayerSearchSource from '@arcgis/core/widgets/Search/LayerSearchSource';

import MapApplication from '@vernonia/map-application/dist/MapApplication';

// widgets
import Address from './widgets/Address';
import Export from './widgets/Export';
import PrintSnapshot from '@vernonia/core/dist/widgets/PrintSnapshot';

// config portal and auth
esriConfig.portalUrl = 'https://gis.vernonia-or.gov/portal';

const load = async () => {
  const taxLots = new FeatureLayer({
    portalItem: {
      id: 'a0837699982f41e6b3eb92429ecdb694',
    },
    popupEnabled: false,
    renderer: new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        color: [255, 255, 255, 0],
        outline: {
          color: 'white',
          width: 0.5,
        },
      }),
    }),
    opacity: 0.25,
  });

  const ugb = new FeatureLayer({
    portalItem: {
      id: '0df1d0d9f7aa45099881c6de540950c8',
    },
    visible: false,
  });

  const cityLimits = new FeatureLayer({
    portalItem: {
      id: '5e1e805849ac407a8c34945c781c1d54',
    },
  });

  const addresses = new FeatureLayer({
    portalItem: {
      id: '467a285e67b94e67825c5c0d402a537a',
    },
    outFields: ['*'],
    popupEnabled: false,
  });

  await cityLimits.load();

  // view
  const view = new MapView({
    map: new Map({
      basemap: new Basemap({
        portalItem: {
          id: '2622b9aecacd401583981410e07d5bb9',
        },
      }),
      layers: [taxLots, ugb, cityLimits, addresses],
      ground: 'world-elevation',
    }),
    extent: cityLimits.fullExtent,
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

  const searchViewModel = new SearchViewModel({
    view,
    searchAllEnabled: false,
    includeDefaultSources: false,
    locationEnabled: false,
    popupEnabled: false,
    resultGraphicEnabled: false,
    autoSelect: false,
    goToOverride: (view, params): void => {
      console.log(view, params);
      view.popup.clear();
      view.popup.close();
      return;
    },
    sources: [
      new LayerSearchSource({
        layer: addresses,
        outFields: ['*'],
        searchFields: ['FullAddress'],
        suggestionTemplate: '{FullAddress}',
        placeholder: 'Search addresses',
      }),
    ],
  });

  const address = new Address({ view, addresses, taxLots, searchViewModel });

  const app = new MapApplication({
    contentBehind: true,
    title: 'Vernonia Addresses',
    panelPosition: 'end',
    panelWidgets: [
      {
        widget: address,
        text: 'Info',
        icon: 'information',
        type: 'calcite-panel',
        open: true,
      },
      {
        widget: new Export({ layer: addresses }),
        text: 'Export',
        icon: 'export',
        type: 'calcite-panel',
      },
      {
        widget: new PrintSnapshot({
          view,
          printServiceUrl:
            'https://gis.vernonia-or.gov/server/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task',
        }),
        text: 'Print',
        icon: 'print',
        type: 'calcite-panel',
      },
    ],
    searchViewModel,
    view,
  });

  address.on('selected', (id: string): void => {
    app.showWidget(id);
  });

  // view.when(() => { });
};

load();
