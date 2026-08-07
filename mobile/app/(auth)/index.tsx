import { Redirect } from 'expo-router';

/**
 * Defensive landing for someone who navigates to /(auth) without specifying
 * a child route. Some expo-router iOS production builds require a literal
 * index file in a route group folder before they'll resolve subroutes.
 * Always redirects to /(auth)/welcome.
 */
export default function AuthIndex() {
  return <Redirect href={'/(auth)/welcome' as any} />;
}
