import esri = __esri;
import { subclass } from '@arcgis/core/core/accessorSupport/decorators';
import Widget from '@arcgis/core/widgets/Widget';
import { tsx } from '@arcgis/core/widgets/support/widget';
import { unparse } from 'papaparse';

@subclass('Export')
export default class Export extends Widget {
  constructor(
    properties: esri.WidgetProperties & {
      layer: esri.FeatureLayer;
    },
  ) {
    super(properties);
  }

  layer!: esri.FeatureLayer;

  async export(): Promise<void> {
    const { layer } = this;
    const q = await layer.queryFeatures({
      where: '1 = 1',
      outFields: ['*'],
      returnGeometry: false,
    });
    if (!q || !q.features) return;
    const csv = unparse(
      q.features.map((feature: esri.Graphic): any => {
        return feature.attributes;
      }),
    );
    const a = Object.assign(document.createElement('a'), {
      href: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`,
      download: 'Vernonia_Addresses.csv',
      style: 'display: none;',
    });
    document.body.append(a);
    a.click();
    document.body.removeChild(a);
  }

  render(): tsx.JSX.Element {
    return (
      <calcite-panel heading="Export">
        <div style="padding: 0.75rem;">
          <calcite-notice open icon="file-csv">
            <div slot="message">Export a CSV file of Vernonia addresses</div>
            <calcite-link slot="link" onclick={this.export.bind(this)}>
              Export
            </calcite-link>
          </calcite-notice>
        </div>
      </calcite-panel>
    );
  }
}
