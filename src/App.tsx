import { Landing } from "./components/Landing";
import { Workspace } from "./components/Workspace";
import { useRoute } from "./hooks/useRoute";

export function App() {
  const [route, navigate] = useRoute();
  return route ? (
    <Workspace key={`${route.owner}/${route.repo}`} route={route} navigate={navigate} />
  ) : (
    <Landing onOpen={navigate} />
  );
}
