import esri = __esri;
import { subclass, property } from '@arcgis/core/core/accessorSupport/decorators';
import Widget from '@arcgis/core/widgets/Widget';
import { tsx } from '@arcgis/core/widgets/support/widget';

let KEY = 0;

@subclass('Address')
export default class Address extends Widget {
  constructor(
    properties: esri.WidgetProperties & {
      view: esri.MapView;
      addresses: esri.FeatureLayer;
      taxLots: esri.FeatureLayer;
      searchViewModel: esri.SearchViewModel;
    },
  ) {
    super(properties);
  }

  async postInitialize(): Promise<void> {
    const { view, addresses, searchViewModel, info } = this;
    this.layerView = await view.whenLayerView(addresses);
    const click = view.on('click', this.clickHandler.bind(this));
    const search = searchViewModel.on('search-complete', this.searchHandler.bind(this));
    const associated = info.on('associated', (feature: esri.Graphic): void => {
      this.clear();
      this.featureHandler(feature);
    });
    this.own([click, search, associated]);
  }

  view!: esri.MapView;

  addresses!: esri.FeatureLayer;

  taxLots!: esri.FeatureLayer;

  searchViewModel!: esri.SearchViewModel;

  layerView!: esri.FeatureLayerView;

  highlight: esri.Handle | null = null;

  feature: esri.Graphic | null = null;

  info = new Info();

  @property()
  protected state: 'ready' | 'querying' | 'selected' = 'ready';

  clear(): void {
    const { highlight } = this;
    if (highlight) {
      highlight.remove();
      this.highlight = null;
    }
    this.feature = null;
  }

  searchHandler(event: esri.SearchViewModelSearchCompleteEvent): void {
    const { state } = this;
    const { numResults, results } = event;
    if (!numResults || state === 'querying') return;
    this.clear();
    this.featureHandler(results[0].results[0].feature);
  }

  async clickHandler(event: esri.ViewClickEvent): Promise<void> {
    const { layerView, state } = this;
    if (state === 'querying') return;
    this.state = 'querying';
    this.clear();
    const q = await layerView.queryFeatures({
      geometry: event.mapPoint,
      returnGeometry: true,
      outFields: ['*'],
      distance: 5,
    });
    q && q.features && q.features.length ? this.featureHandler(q.features[0]) : (this.state = 'ready');
  }

  async featureHandler(feature: esri.Graphic): Promise<void> {
    const { id, view, layerView, addresses, taxLots } = this;
    const q = await taxLots.queryFeatures({
      geometry: feature.geometry,
      outFields: ['*'],
      returnGeometry: true,
    });
    if (!q || !q.features || !q.features.length) {
      this.state = 'ready';
      return;
    }
    const taxLot = q.features[0];
    const q2 = await addresses.queryFeatures({
      where: `${addresses.objectIdField} <> ${feature.attributes[addresses.objectIdField]}`,
      geometry: taxLot.geometry,
      outFields: ['*'],
      returnGeometry: true,
    });
    if (!q2 || !q2.features) {
      this.state = 'ready';
      return;
    }
    this.info.info = {
      address: feature,
      taxLot,
      addresses: q2.features,
    };
    this.feature = feature;
    this.highlight = layerView.highlight(feature);
    this.state = 'selected';
    this.emit('selected', id);
    await view.goTo(feature);
    if (view.scale > 1128) view.scale = 1128;
  }

  render(): tsx.JSX.Element {
    const { feature, state } = this;
    const heading = feature && state === 'selected' ? feature.attributes.Address : 'Address Info';
    return (
      <calcite-panel heading={heading}>
        <div hidden={state !== 'ready'} style="padding: 0.75rem;">
          <calcite-notice icon="cursor-click" open="">
            <div slot="message">Click an address in the map or search addresses to view address information</div>
          </calcite-notice>
        </div>
        <div
          hidden={state !== 'selected'}
          style="padding: 0.75rem;"
          afterCreate={(container: HTMLDivElement): void => {
            this.info.container = container;
          }}
        ></div>
      </calcite-panel>
    );
  }
}

@subclass('Info')
class Info extends Widget {
  @property()
  info: {
    address: esri.Graphic;
    taxLot: esri.Graphic;
    addresses: esri.Graphic[];
  } | null = null;

  render(): tsx.JSX.Element {
    const { info } = this;

    if (!info) return <div key={KEY++}></div>;

    const {
      address: {
        attributes: {
          HouseNum,
          HouseNumUnit,
          DirectionPrefix,
          StreetName,
          StreetType,
          DirectionSuffix,
          UnitType,
          Unit,
          Latitude,
          Longitude,
          PrimarySitus,
        },
      },
      taxLot: {
        attributes: { TAXLOT_ID, ACCOUNT_IDS, TAXMAP, ADDRESS, OWNER },
      },
      addresses,
    } = info;

    const accounts = ACCOUNT_IDS.split(',').map((account: string): tsx.JSX.Element => {
      return (
        <calcite-link
          key={KEY++}
          href={`https://propertyquery.columbiacountyor.gov/columbiaat/MainQueryDetails.aspx?AccountID=${account}&QueryYear=2023&Roll=R`}
          target="_blank"
          style="margin-right: 0.5rem;"
        >
          {account}
        </calcite-link>
      );
    });

    const associated = addresses.map((address: esri.Graphic): tsx.JSX.Element => {
      return (
        <tr key={KEY++}>
          <th colspan="2" style="border-right: 0;">
            <calcite-link
              onclick={(): void => {
                this.emit('associated', address);
              }}
            >
              {address.attributes.Address}
              {address.attributes.PrimarySitus === 'Yes' ? ' (primary)' : ''}
            </calcite-link>
          </th>
        </tr>
      );
    });

    return (
      <div key={KEY++}>
        <table class="esri-widget__table">
          <tr>
            <th>House number</th>
            <td>{HouseNum}</td>
          </tr>
          {HouseNumUnit ? (
            <tr key={KEY++}>
              <th>House number unit</th>
              <td>{HouseNumUnit}</td>
            </tr>
          ) : null}
          {DirectionPrefix ? (
            <tr key={KEY++}>
              <th>Direction prefix</th>
              <td>{DirectionPrefix}</td>
            </tr>
          ) : null}
          <tr>
            <th>Street name</th>
            <td>{StreetName}</td>
          </tr>
          <tr>
            <th>Street type</th>
            <td>{StreetType}</td>
          </tr>
          {DirectionSuffix ? (
            <tr key={KEY++}>
              <th>Direction suffix</th>
              <td>{DirectionSuffix}</td>
            </tr>
          ) : null}
          {UnitType ? (
            <tr key={KEY++}>
              <th>Unit type</th>
              <td>{UnitType}</td>
            </tr>
          ) : null}
          {Unit ? (
            <tr key={KEY++}>
              <th>Unit</th>
              <td>{Unit}</td>
            </tr>
          ) : null}
          <tr>
            <th>Lat / Long</th>
            <td>
              {Latitude}, {Longitude}
            </td>
          </tr>
          <tr>
            <th>Primary situs</th>
            <td>{PrimarySitus}</td>
          </tr>
          <tr>
            <th colspan="2" style="border-right: 0; font-weight: var(--calcite-font-weight-bold);">
              Tax Lot
            </th>
          </tr>
          <tr>
            <th>Id</th>
            <td>{TAXLOT_ID}</td>
          </tr>
          <tr>
            <th>Owner</th>
            <td>{OWNER}</td>
          </tr>
          <tr>
            <th>Situs address</th>
            <td>{ADDRESS}</td>
          </tr>
          <tr>
            <th>Tax account(s)</th>
            <td>{accounts}</td>
          </tr>
          <tr>
            <th>Tax map</th>
            <td>
              <calcite-link href={`https://gis.columbiacountymaps.com/TaxMaps/${TAXMAP}.pdf`} target="_blank">
                {TAXMAP}
              </calcite-link>
            </td>
          </tr>
          {associated.length ? (
            <tr key={KEY++}>
              <th colspan="2" style="border-right: 0; font-weight: var(--calcite-font-weight-bold);">
                Associated addresses
              </th>
            </tr>
          ) : null}
          {associated}
        </table>
      </div>
    );
  }
}
