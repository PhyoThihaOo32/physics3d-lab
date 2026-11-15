const RADIUS = 0.35;

export function BicycleWheel() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[RADIUS, 0.032, 12, 64]} />
        <meshStandardMaterial color="#222930" roughness={0.86} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RADIUS - 0.025, 0.014, 10, 64]} />
        <meshStandardMaterial color="#a9b6bf" metalness={0.42} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RADIUS, 0.034, 12, 16, 0.62]} />
        <meshStandardMaterial color="#83d5c1" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.045, 0.045, 0.15, 24]} />
        <meshStandardMaterial color="#8d9ba3" metalness={0.38} />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => (
        <group key={index} rotation={[0, (index * Math.PI) / 6, 0]}>
          <mesh
            position={[0, index % 2 === 0 ? 0.022 : -0.022, 0.181]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.005, 0.005, 0.301, 6]} />
            <meshStandardMaterial color="#a9bac2" roughness={0.34} />
          </mesh>
        </group>
      ))}
    </>
  );
}
