/**
 * Initiates the logic for augmented reality.
 * Todo make it possible to use 16:9 ratio.
 */
declare function init(stream: MediaStream): Promise<any>;
declare function start(foyer: string): Promise<void>;
declare function stop(): void;
declare function toggleMonoyer(toggle: boolean): void;
declare function loadBlazeFaceModel(): Promise<void>;
export { init, start, stop, toggleMonoyer, loadBlazeFaceModel };
