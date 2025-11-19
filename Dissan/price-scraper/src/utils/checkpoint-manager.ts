/**
 * Checkpoint Manager - Gestion des points de sauvegarde pour reprendre le scraping
 */

import fs from 'fs';
import path from 'path';
import type { Checkpoint } from '../types';
import { PATHS } from '../config';

export class CheckpointManager {
  private competitorId: string;
  private checkpointFile: string;

  constructor(competitorId: string) {
    this.competitorId = competitorId;
    this.checkpointFile = path.join(
      PATHS.checkpointsDir,
      `${competitorId}-checkpoint.json`
    );
  }

  /**
   * Save checkpoint to file
   */
  async save(checkpoint: Checkpoint): Promise<void> {
    try {
      const data = JSON.stringify(checkpoint, null, 2);
      await fs.promises.writeFile(this.checkpointFile, data, 'utf-8');
    } catch (error) {
      console.error(`Failed to save checkpoint: ${error}`);
      throw error;
    }
  }

  /**
   * Load checkpoint from file
   */
  async load(): Promise<Checkpoint | null> {
    try {
      if (!fs.existsSync(this.checkpointFile)) {
        return null;
      }

      const data = await fs.promises.readFile(this.checkpointFile, 'utf-8');
      const checkpoint = JSON.parse(data) as Checkpoint;

      // Convert timestamp string back to Date
      checkpoint.timestamp = new Date(checkpoint.timestamp);
      checkpoint.results.forEach((r) => {
        r.timestamp = new Date(r.timestamp);
      });

      return checkpoint;
    } catch (error) {
      console.error(`Failed to load checkpoint: ${error}`);
      return null;
    }
  }

  /**
   * Clear checkpoint file
   */
  async clear(): Promise<void> {
    try {
      if (fs.existsSync(this.checkpointFile)) {
        await fs.promises.unlink(this.checkpointFile);
      }
    } catch (error) {
      console.error(`Failed to clear checkpoint: ${error}`);
    }
  }

  /**
   * Check if checkpoint exists
   */
  exists(): boolean {
    return fs.existsSync(this.checkpointFile);
  }

  /**
   * Get checkpoint file path
   */
  getFilePath(): string {
    return this.checkpointFile;
  }
}
