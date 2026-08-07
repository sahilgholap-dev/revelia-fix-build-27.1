// Drop-in seam over @react-native-community/datetimepicker.
//
// The package's TurboModule specs call TurboModuleRegistry.getEnforcing at
// import time, which is fatal on web — and because Expo Router eagerly requires
// every route file, one such import in one screen crashes the entire web app at
// startup. Metro resolves DateTimeField.web.tsx for web bundles, so the package
// never enters the web graph.
//
// This native side is a PASSTHROUGH on purpose: same component, same props, so
// Android behaviour is byte-identical to the direct import it replaced. Only
// the import specifier changed at the five call sites.
import DateTimePicker from '@react-native-community/datetimepicker';

export const DateTimeField = DateTimePicker;
