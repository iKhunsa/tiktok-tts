# Tours: moderation, overlays and plugin store

Validated selectors:

| Tour | Selector | Defined at |
| --- | --- | --- |
| Moderation | `#view-moderacion .view-header`, `.mod-tabs`, `.mod-filters`, `#modStats`, `.mod-table-wrap` | `interfaz/index.html:1122-1168` |
| Moderation | `#btnBlockedWordsShortcut` | `interfaz/index.html:153` |
| Overlays | `#view-overlays .view-header`, `#cfg-url-chat`, `#cfg-url-seguidores`, `#cfg-url-likes`, `#cfg-url-alertas`, `#cfg-alertas-bgimg` | `interfaz/index.html:251-473` |
| Overlays | `[onclick="testGiftAlert()"]` | `interfaz/index.html:472` |
| Plugin store | `#pluginStoreHeader`, `#pluginStoreGrid` | `interfaz/index.html:1209-1214` |
| Plugin store | `.store-card[data-tool-id="overlays"]`, `.store-card-icon-lightbulb` | `interfaz/publico/plugin-store/grid.js:39-70` |
| Plugin store | `.store-detail-actions`, `.store-detail-order` | `interfaz/publico/plugin-store/detail.js:36-58` |

The moderation tour has 6 steps, overlays has 7, and the plugin store has 6. The plugin-store detail is rendered before the tour begins; callbacks only switch panels so Driver keeps its measured nodes attached.
