export function RotationStage() {
  return (
    <>
      <mesh position={[0, -0.065, 0]} receiveShadow>
        <cylinderGeometry args={[1.25, 1.3, 0.12, 80]} />
        <meshStandardMaterial
          color="#283139"
          roughness={0.48}
          metalness={0.35}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.13, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#15242d" />
      </mesh>
      <gridHelper
        args={[10, 20, '#344b57', '#233640']}
        position={[0, -0.125, 0]}
      />
    </>
  );
}
