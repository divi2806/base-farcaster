'use client'

import { useEffect, useRef } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { savePlayerScore, getTopPlayers } from '@/lib/firebase'

declare global {
  interface Window {
    FarcadeSDK: any
    Phaser: any
    ethereum: any
  }
}

export default function SurvivorZombiesGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameInstanceRef = useRef<any>(null)

  useEffect(() => {
    // Load Phaser and Farcade SDK
    const loadScripts = async () => {
      if (typeof window === 'undefined') return

      // Load Phaser
      if (!window.Phaser) {
        const phaserScript = document.createElement('script')
        phaserScript.src = 'https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.min.js'
        phaserScript.async = true
        document.head.appendChild(phaserScript)

        await new Promise((resolve) => {
          phaserScript.onload = resolve
        })
      }

      // Load Farcade SDK
      if (!window.FarcadeSDK) {
        const farcadeScript = document.createElement('script')
        farcadeScript.src = 'https://cdn.jsdelivr.net/npm/@farcade/game-sdk@0.2.0/dist/index.min.js'
        farcadeScript.async = true
        document.head.appendChild(farcadeScript)

        await new Promise((resolve) => {
          farcadeScript.onload = resolve
        })
      }

      // Load Google Fonts
      const link = document.createElement('link')
      link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'
      link.rel = 'stylesheet'
      document.head.appendChild(link)

      // Wait for font to load
      await document.fonts.load('16px "Press Start 2P"')

      initializeGame()
    }

    const initializeGame = () => {
      if (!gameContainerRef.current || gameInstanceRef.current) return

      // Game constants and variables
      const WIDTH = 360
      const HEIGHT = 640
      const MAP_PAD = 1000
      const TERRAIN_SCALE = 1.5 // Scale factor for terrain (makes everything look bigger)

      let cursors: any, keys: any
      let loadingText: any
      let player: any, gun: any, bullets: any, lastFired = 0
      let currentGun = "pistol"
      let zombies: any
      let moneyGroup: any
      let shop: any, shopMenu: any, stimmyBtn: any, shotgunBtn: any
      let isNearShop = false
      let navbarBg: any, madeByText: any, heartImage: any, scoreText: any, cashText: any, dayNightImage: any, timerText: any, waveText: any
      let health = 5
      let score = 0
      let cash = 0
      let kills = 0
      let canBeHit = true
      let spawnTimer = 0
      let waveTimer = 0
      let waveActive = false
      let waveNumber = 1
      let gameOver = false
      let playerContainer: any
      let healthBar: any
      let joystickBase: any
      let joystickHandle: any
      let joystickActive = false
      let joystickPointerId: any = null
      let shopPointerId: any = null
      let joystickBaseX: number
      let joystickBaseY: number
      let maxJoystickDistance = 50
      let rt: any
      let startGameHintBg: any, startGameHintText: any
      let endStatsHeading: any, endStatsText: any, endContinueBtn: any, endbg: any, endbgblack: any, claimBtn: any, chestSprite: any
      let claimResultText: any, claimExitBtn: any, coinImage: any
      let isClaimScreenActive = false
      let hasClaimed = false
      let footstepsTimer = 0
      let hasPlayedShopVoice = false
      let hasPlayedDeathscream = false

      // Virus mutation meter variables
      let mutationMeter = 0
      const MUTATION_KILLS_NEEDED = 4 // Kills needed to fill meter
      let mutationBar: any
      let mutationIcon: any
      let isPuzzleActive = false
      let currentWaveCleared = false
      let solvePuzzleBtn: any
      let showSolvePuzzleBtn = false

      const uiTextStyle = {
        fontFamily: '"Press Start 2P"',
        fontSize: "11px",
        fill: "#ffffff",
      }

      let gameTimeMinutes = 9 * 60
      let isDay = true
      let lastIsDay = true

      // Utility functions
      function updateShopBtns() {
        if (cash < 10 || health >= 5) {
          stimmyBtn.setTint(0x555555)
          stimmyBtn.disableInteractive()
        } else {
          stimmyBtn.clearTint()
          stimmyBtn.setInteractive()
        }

        if (cash < 50 || currentGun === "shotgun") {
          shotgunBtn.setTint(0x555555)
          shotgunBtn.disableInteractive()
        } else {
          shotgunBtn.clearTint()
          shotgunBtn.setInteractive()
        }
      }

      function createCircleTexture(scene: any, key: string, radius: number, fillColor: number, strokeColor: number) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false })
        g.fillStyle(fillColor, 1)
        g.fillCircle(radius, radius, radius)
        g.lineStyle(Math.max(2, Math.round(radius * 0.12)), strokeColor, 1)
        g.strokeCircle(radius, radius, radius)
        g.generateTexture(key, radius * 2 + 2, radius * 2 + 2)
        g.destroy()
      }

      function shoot(scene: any, tx: number, ty: number) {
        const now = scene.time.now
        const fireRate = currentGun === "shotgun" ? 400 : 180
        if (now - lastFired < fireRate) return
        lastFired = now

        const shootSounds = ["pistolshoot1", "pistolshoot2", "pistolshoot3"]
        const randomSound = shootSounds[Math.floor(Math.random() * shootSounds.length)]
        scene.sound.play(randomSound, { volume: 0.1 })

        const baseAngle = window.Phaser.Math.Angle.Between(player.x, player.y, tx, ty)
        const speed = 900
        const spread = currentGun === "shotgun" ? window.Phaser.Math.DegToRad(8) : 0

        let bulletCount = currentGun === "shotgun" ? 3 : 1
        let startOffset = -(bulletCount - 1) / 2
        let bulletLifetime = currentGun === "shotgun" ? 200 : 300

        for (let i = 0; i < bulletCount; i++) {
          const angle = baseAngle + (startOffset + i) * spread
          const offsetX = -Math.sin(angle) - 10
          const offsetY = Math.cos(angle)

          const bullet = bullets.get(player.x + offsetX, player.y + offsetY, "bullet")
          if (!bullet) continue

          bullet.setActive(true)
          bullet.setVisible(true)
          bullet.body.reset(player.x + offsetX, player.y + offsetY)
          bullet.setDepth(1)
          bullet.setRotation(angle)

          scene.physics.velocityFromRotation(angle, speed, bullet.body.velocity)

          scene.time.addEvent({
            delay: bulletLifetime,
            callback: () => {
              if (bullet && bullet.body) bullet.destroy()
            },
          })
        }
      }

      function bulletHitsZombie(bullet: any, zombie: any) {
        if (!bullet.active || !zombie.active) return
        bullet.destroy()
        zombie.health -= 1
        const zombieHitSounds = ["zombiehit1", "zombiehit2", "zombiehit3", "zombiehit4"]
        const randomSound = zombieHitSounds[Math.floor(Math.random() * zombieHitSounds.length)]

        // @ts-ignore
        this.sound.play(randomSound, { volume: 1 })
        zombie.setTint(0xffffff)
        zombie.scene.time.addEvent({
          delay: 80,
          callback: () => zombie.clearTint(),
        })
        if (zombie.health <= 0) {
          pointsForKill(zombie.scene, zombie)
          // @ts-ignore
          this.sound.play("bonecrack", { volume: 0.3 })
          kills++

          // Increment mutation meter on kill
          if (!isPuzzleActive && !currentWaveCleared && !showSolvePuzzleBtn) {
            mutationMeter++
            if (mutationMeter >= MUTATION_KILLS_NEEDED) {
              // Show solve puzzle button
              showSolvePuzzleBtn = true
              if (solvePuzzleBtn) {
                solvePuzzleBtn.setVisible(true)
              }
            }
          }
        } else {
          const dir = window.Phaser.Math.Angle.Between(bullet.x, bullet.y, zombie.x, zombie.y)
          zombie.body.velocity.x += Math.cos(dir) * 80
          zombie.body.velocity.y += Math.sin(dir) * 80
        }
      }

      function bulletHitsBuilding(bullet: any, tile: any) {
        if (!bullet.active) return
        const p = bullet.scene.add.particles("yellowParticle")
        const emitter = p.createEmitter({
          x: bullet.x,
          y: bullet.y,
          speed: { min: 80, max: 200 },
          angle: { min: 0, max: 360 },
          gravityY: 0,
          lifespan: 400,
          quantity: 12,
          scale: { start: 0.9, end: 0 },
          on: false,
        })
        emitter.explode(12, bullet.x, bullet.y)
        bullet.destroy()
      }

      function zombieHitsPlayer(playerObj: any, zombie: any) {
        if (!canBeHit || !zombie.active || !playerObj.active) return
        canBeHit = false
        playerObj._invulnTimer = 1200
        playerObj.setTint(0xff4444)
        health -= 1
        // @ts-ignore
        this.sound.play("playerhit", { volume: 0.5 })
        if (window.FarcadeSDK) {
          window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
        }
        zombie.scene.cameras.main.shake(180, 0.01)
        const angle = window.Phaser.Math.Angle.Between(zombie.x, zombie.y, playerObj.x, playerObj.y)
        playerObj.body.velocity.x += Math.cos(angle) * 180
        playerObj.body.velocity.y += Math.sin(angle) * 180
      }

      function spawnZombie(scene: any) {
        const edge = window.Phaser.Math.Between(0, 3)
        let x: number, y: number
        const margin = Math.max(WIDTH, HEIGHT) * 0.6
        if (edge === 0) {
          x = window.Phaser.Math.Between(player.x - margin, player.x + margin)
          y = player.y - margin - window.Phaser.Math.Between(80, 220)
        } else if (edge === 1) {
          x = player.x + margin + window.Phaser.Math.Between(80, 220)
          y = window.Phaser.Math.Between(player.y - margin, player.y + margin)
        } else if (edge === 2) {
          x = window.Phaser.Math.Between(player.x - margin, player.x + margin)
          y = player.y + margin + window.Phaser.Math.Between(80, 220)
        } else {
          x = player.x - margin - window.Phaser.Math.Between(80, 220)
          y = window.Phaser.Math.Between(player.y - margin, player.y + margin)
        }

        const zombieTypes = [
          { type: "normal", weight: 40 },
          { type: "kid", weight: 35 },
          { type: "giant", weight: 25 }
        ]

        const totalWeight = zombieTypes.reduce((sum, z) => sum + z.weight, 0)
        let pick = window.Phaser.Math.Between(1, totalWeight)
        let chosenType = "normal"

        for (const ztype of zombieTypes) {
          pick -= ztype.weight
          if (pick <= 0) {
            chosenType = ztype.type
            break
          }
        }

        let z: any

        switch (chosenType) {
          case "normal":
            z = scene.physics.add.sprite(x, y, "zombie")
            z.setTexture("zombie")
            z.zombieTypeSpawned = "normal"
            z.health = window.Phaser.Math.Between(1, 2)
            z.baseSpeed = window.Phaser.Math.Between(30, 60) + Math.min(60, Math.floor(score / 6)) + waveNumber * 5
            z.setDisplaySize(32 * TERRAIN_SCALE, 46 * TERRAIN_SCALE)
            z.clearTint()
            break

          case "kid":
            z = scene.physics.add.sprite(x, y, "zombiekid")
            z.setTexture("zombiekid")
            z.zombieTypeSpawned = "kid"
            z.health = 1
            z.baseSpeed = window.Phaser.Math.Between(50, 70) + Math.min(60, Math.floor(score / 6)) + waveNumber * 6
            z.setDisplaySize(28 * TERRAIN_SCALE, 28 * TERRAIN_SCALE)
            break

          case "giant":
            z = scene.physics.add.sprite(x, y, "zombiegiant")
            z.setTexture("zombiegiant")
            z.zombieTypeSpawned = "giant"
            z.health = window.Phaser.Math.Between(5, 8)
            z.baseSpeed = window.Phaser.Math.Between(20, 40) + waveNumber * 5
            z.setDisplaySize(48 * TERRAIN_SCALE, 49 * TERRAIN_SCALE)
            break
        }

        z.setDepth(1)
        z.setCollideWorldBounds(true)
        z.setBounce(0.1)
        z.setMask(scene.zombieMask)
        zombies.add(z)
      }

      function pointsForKill(scene: any, zombie: any) {
        const p = scene.add.particles("blood")
        const emitter = p.createEmitter({
          x: zombie.x,
          y: zombie.y,
          speed: { min: 80, max: 200 },
          angle: { min: 0, max: 360 },
          gravityY: 0,
          lifespan: 400,
          quantity: 12,
          scale: { start: 0.9, end: 0 },
          on: false,
        })
        emitter.explode(12, zombie.x, zombie.y)
        if (zombie.zombieTypeSpawned === "normal") score += 5
        if (zombie.zombieTypeSpawned === "kid") score += 10
        if (zombie.zombieTypeSpawned === "giant") score += 25
        const money = moneyGroup.create(zombie.x, zombie.y, "money")
        if (money) {
          money.setDepth(2)
          money.setScale(0.18 * TERRAIN_SCALE) // Bigger coin size
          money.setMask(scene.zombieMask)
          // Add strong light blue glow effect using postFX pipeline
          if (money.postFX) {
            // Light blue glow - increased intensity for more visible glow
            money.postFX.addGlow(0x66ccff, 8, 0, false, 0.2, 16)
          }
          // Play coin spin animation
          money.play("money-spin")
        }
        zombie.destroy()
        if (waveActive && window.Phaser.Math.Between(0, 100) < 18) spawnZombie(scene)
      }

      function collectMoney(player: any, moneyItem: any) {
        cash += window.Phaser.Math.Between(1, 3)
        moneyItem.destroy()
        updateShopBtns()
        // @ts-ignore
        this.sound.play("moneypickup", { volume: 0.5 })
      }

      function finishGame(scene: any) {
        gameOver = true
        if (window.FarcadeSDK) {
          window.FarcadeSDK.singlePlayer.actions.gameOver({ score: score })
        }
      }

      function restart(scene: any) {
        zombies.clear(true, true)
        bullets.clear(true, true)
        moneyGroup.clear(true, true)
        health = 5
        score = 0
        cash = 0
        kills = 0
        currentGun = "pistol"
        canBeHit = true
        gameOver = false
        waveActive = false
        waveTimer = 0
        spawnTimer = 0
        waveNumber = 0
        gameTimeMinutes = 9 * 60
        scene.cameras.main.fadeIn(300, 0, 0, 0)
        player.enableBody(true, 0, 0, true, true)
        player.x = 450
        player.y = 550
        player.clearTint()
        player._invulnTimer = 0
        gun.setTexture("gun")
        gun.setOrigin(0, 0.5)
        gun.setDisplaySize(32 * TERRAIN_SCALE, 14 * TERRAIN_SCALE)
        if (playerContainer) playerContainer.setPosition(player.x, player.y)
        if (scene.vision) scene.vision.setScale(2 * TERRAIN_SCALE)
        rt.visible = true
        dayNightImage.setTexture("sun")
        timerText.setText("")
        joystickActive = false
        joystickPointerId = null
        joystickHandle.setPosition(joystickBaseX, joystickBaseY)
        hasPlayedDeathscream = false
        isClaimScreenActive = false
        // Reset chest to first frame
        if (chestSprite) chestSprite.setFrame(0)
        // Reset mutation meter and puzzle state
        mutationMeter = 0
        isPuzzleActive = false
        currentWaveCleared = false
        showSolvePuzzleBtn = false
        if (solvePuzzleBtn) solvePuzzleBtn.setVisible(false)
      }

      // DNA Puzzle Functions - Comprehensive System

      // DNA/RNA base pairing rules
      const DNA_COMPLEMENT: { [key: string]: string } = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C' }
      const RNA_COMPLEMENT: { [key: string]: string } = { 'A': 'U', 'T': 'A', 'C': 'G', 'G': 'C' }

      // Generate random DNA sequence based on wave
      function generateDNASequence(wave: number): string[] {
        const bases = ['A', 'T', 'C', 'G']
        let length = 4
        if (wave >= 6 && wave <= 10) length = Math.random() < 0.5 ? 5 : 6
        else if (wave >= 11 && wave <= 20) length = Math.random() < 0.5 ? 7 : 8
        else if (wave % 5 === 0) length = 10 // Boss waves

        const sequence: string[] = []
        for (let i = 0; i < length; i++) {
          sequence.push(bases[Math.floor(Math.random() * 4)])
        }
        return sequence
      }

      // Get complement strand
      function getComplement(sequence: string[], useRNA = false): string[] {
        const rules = useRNA ? RNA_COMPLEMENT : DNA_COMPLEMENT
        return sequence.map(base => rules[base])
      }

      // Generate wrong answers that look plausible
      function generateWrongAnswer(correct: string[]): string[] {
        const wrong = [...correct]
        const mutationType = Math.floor(Math.random() * 4)
        const pos = Math.floor(Math.random() * wrong.length)
        const bases = ['A', 'T', 'C', 'G']

        switch (mutationType) {
          case 0: // Swap a base
            wrong[pos] = bases.filter(b => b !== wrong[pos])[Math.floor(Math.random() * 3)]
            break
          case 1: // Shift one base
            if (pos < wrong.length - 1) {
              const temp = wrong[pos]
              wrong[pos] = wrong[pos + 1]
              wrong[pos + 1] = temp
            }
            break
          case 2: // Replace with random
            wrong[pos] = bases[Math.floor(Math.random() * 4)]
            break
          case 3: // Duplicate adjacent
            if (pos > 0) wrong[pos] = wrong[pos - 1]
            break
        }
        return wrong
      }

      // Select puzzle type based on wave
      function selectPuzzleType(wave: number): number {
        // Puzzle types: 1-Basic, 2-Missing, 3-Build, 4-MutationDetect, 5-MutationClass, 6-RNA, 7-Stability, 8-Adaptation
        if (wave <= 2) return 1 // Basic only for first waves
        if (wave <= 4) return Math.random() < 0.7 ? 1 : 2
        if (wave <= 6) return [1, 2, 3][Math.floor(Math.random() * 3)]
        if (wave <= 10) return [1, 2, 3, 4, 5][Math.floor(Math.random() * 5)]
        if (wave <= 15) return [2, 3, 4, 5, 6, 7][Math.floor(Math.random() * 6)]
        return Math.floor(Math.random() * 8) + 1 // All types for high waves
      }

      // Array to track all puzzle elements for cleanup
      let puzzleElements: any[] = []

      // Helper to add element to puzzle (adds to scene with proper depth and tracking)
      // Base depth: 6002 for text, 6003 for interactive buttons, 6004 for button text
      function addPuzzleElement(element: any, depth = 6002) {
        element.setScrollFactor(0).setDepth(depth)
        puzzleElements.push(element)
        return element
      }

      function showDNAPuzzle(scene: any) {
        isPuzzleActive = true
        puzzleElements = []

        // Pause zombie movement
        zombies.getChildren().forEach((z: any) => {
          z.body.velocity.x = 0
          z.body.velocity.y = 0
        })

        // Dark background - added directly to scene with high depth
        const puzzleBg = scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.9)
          .setScrollFactor(0)
          .setDepth(6000)
          .setInteractive() // Block clicks on game behind
        puzzleElements.push(puzzleBg)

        // Shop background (same as leaderboard)
        const puzzleBoard = scene.add.image(WIDTH / 2, HEIGHT / 2, "shopbg")
          .setDisplaySize(340, 480)
          .setScrollFactor(0)
          .setDepth(6001)
        puzzleElements.push(puzzleBoard)

        // Select puzzle type based on wave
        const puzzleType = selectPuzzleType(waveNumber)

        // Generate puzzle based on type
        switch (puzzleType) {
          case 1:
            createBasicComplementPuzzle(scene)
            break
          case 2:
            createMissingBasePuzzle(scene)
            break
          case 3:
            createBuildComplementPuzzle(scene)
            break
          case 4:
            createMutationDetectionPuzzle(scene)
            break
          case 5:
            createMutationClassificationPuzzle(scene)
            break
          case 6:
            createRNAModePuzzle(scene)
            break
          case 7:
            createStabilityPuzzle(scene)
            break
          case 8:
            createAdaptationPuzzle(scene)
            break
          default:
            createBasicComplementPuzzle(scene)
        }
      }

      // PUZZLE TYPE 1: Basic Complement
      function createBasicComplementPuzzle(scene: any) {
        const sequence = generateDNASequence(waveNumber)
        const correct = getComplement(sequence)

        // Title - add directly to scene
        const title = scene.add.text(WIDTH / 2, HEIGHT / 2 - 200, "DNA PAIRING", {
          fontFamily: '"Press Start 2P"', fontSize: "12px", fill: "#ff4444",
          stroke: "#000000", strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        puzzleElements.push(title)

        const subtitle = scene.add.text(WIDTH / 2, HEIGHT / 2 - 175, "Choose the complement!", {
          fontFamily: '"Press Start 2P"', fontSize: "7px", fill: "#ffffff",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        puzzleElements.push(subtitle)

        // Show original strand
        const strandLabel = scene.add.text(WIDTH / 2, HEIGHT / 2 - 140, "Strand:", {
          fontFamily: '"Press Start 2P"', fontSize: "8px", fill: "#aaaaaa",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        puzzleElements.push(strandLabel)

        const strandText = scene.add.text(WIDTH / 2, HEIGHT / 2 - 115, sequence.join(" "), {
          fontFamily: '"Press Start 2P"', fontSize: "16px", fill: "#44aaff",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        puzzleElements.push(strandText)

        // Generate options (1 correct + 2 wrong)
        const options = [correct]
        while (options.length < 3) {
          const wrong = generateWrongAnswer(correct)
          if (!options.some(o => o.join('') === wrong.join(''))) {
            options.push(wrong)
          }
        }
        // Shuffle options
        options.sort(() => Math.random() - 0.5)

        let selectedOption: number | null = null
        const optionButtons: any[] = []

        options.forEach((opt, i) => {
          const y = HEIGHT / 2 - 50 + i * 60
          const optBg = scene.add.rectangle(WIDTH / 2, y, 280, 45, 0x333366)
            .setStrokeStyle(3, 0x666699)
            .setScrollFactor(0)
            .setDepth(6003)
            .setInteractive({ useHandCursor: true })
          puzzleElements.push(optBg)

          const letter = ['A', 'B', 'C'][i]
          const optText = scene.add.text(WIDTH / 2, y, `${letter}) ${opt.join(" ")}`, {
            fontFamily: '"Press Start 2P"', fontSize: "12px", fill: "#ffffff",
          }).setOrigin(0.5).setScrollFactor(0).setDepth(6004)
          puzzleElements.push(optText)

          optionButtons.push({ bg: optBg, text: optText, option: opt })

          optBg.on("pointerdown", () => {
            selectedOption = i
            optionButtons.forEach((btn, idx) => {
              btn.bg.setStrokeStyle(3, idx === i ? 0x00ff00 : 0x666699)
              btn.bg.setFillStyle(idx === i ? 0x446644 : 0x333366)
            })
          })
        })

        // Confirm button
        createConfirmButton(scene, () => {
          if (selectedOption === null) return false
          return options[selectedOption].join('') === correct.join('')
        })
      }

      // PUZZLE TYPE 2: Missing Base
      function createMissingBasePuzzle(scene: any) {
        const sequence = generateDNASequence(waveNumber)
        const complement = getComplement(sequence)
        const missingIndex = Math.floor(Math.random() * sequence.length)
        const correctBase = complement[missingIndex]

        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 200, "MISSING BASE", {
          fontFamily: '"Press Start 2P"', fontSize: "12px", fill: "#ff4444",
          stroke: "#000000", strokeThickness: 3,
        }).setOrigin(0.5))

        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 175, "Which base completes it?", {
          fontFamily: '"Press Start 2P"', fontSize: "7px", fill: "#ffffff",
        }).setOrigin(0.5))

        // Show DNA strand
        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 140, "DNA:", {
          fontFamily: '"Press Start 2P"', fontSize: "8px", fill: "#aaaaaa",
        }).setOrigin(0.5))

        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 115, sequence.join(" "), {
          fontFamily: '"Press Start 2P"', fontSize: "14px", fill: "#44aaff",
        }).setOrigin(0.5))

        // Show complement with missing base
        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 85, "Complement:", {
          fontFamily: '"Press Start 2P"', fontSize: "8px", fill: "#aaaaaa",
        }).setOrigin(0.5))

        const displayComp = complement.map((b, i) => i === missingIndex ? "?" : b)
        const compText = addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 60, displayComp.join(" "), {
          fontFamily: '"Press Start 2P"', fontSize: "14px", fill: "#ffaa44",
        }).setOrigin(0.5))

        // Base options
        const bases = ['A', 'T', 'C', 'G']
        let selectedBase: string | null = null
        const baseButtons: any[] = []

        bases.forEach((base, i) => {
          const x = WIDTH / 2 - 100 + i * 65
          const y = HEIGHT / 2 + 20

          const baseBg = addPuzzleElement(scene.add.rectangle(x, y, 55, 55, 0x444488)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true }), 6003)

          addPuzzleElement(scene.add.text(x, y, base, {
            fontFamily: '"Press Start 2P"', fontSize: "20px", fill: "#ffffff",
          }).setOrigin(0.5), 6004)

          baseButtons.push({ bg: baseBg, base })

          baseBg.on("pointerdown", () => {
            selectedBase = base
            baseButtons.forEach(btn => {
              btn.bg.setStrokeStyle(3, btn.base === base ? 0x00ff00 : 0xffffff)
              btn.bg.setFillStyle(btn.base === base ? 0x448844 : 0x444488)
            })
            // Update display
            displayComp[missingIndex] = base
            compText.setText(displayComp.join(" "))
          })
        })

        createConfirmButton(scene, () => {
          if (selectedBase === null) return false
          return selectedBase === correctBase
        })
      }

      // PUZZLE TYPE 3: Build Your Own Complement
      function createBuildComplementPuzzle(scene: any) {
        const sequence = generateDNASequence(Math.min(waveNumber, 6)) // Max 6 for this type
        const correct = getComplement(sequence)
        const playerAnswer: string[] = []

        const title = scene.add.text(WIDTH / 2, HEIGHT / 2 - 200, "BUILD COMPLEMENT", {
          fontFamily: '"Press Start 2P"', fontSize: "11px", fill: "#ff4444",
          stroke: "#000000", strokeThickness: 3,
        }).setOrigin(0.5)
        addPuzzleElement(title)

        const subtitle = scene.add.text(WIDTH / 2, HEIGHT / 2 - 175, "Tap bases in order!", {
          fontFamily: '"Press Start 2P"', fontSize: "7px", fill: "#ffffff",
        }).setOrigin(0.5)
        addPuzzleElement(subtitle)

        // Show strand
        const strandText = scene.add.text(WIDTH / 2, HEIGHT / 2 - 140, "Strand: " + sequence.join(" "), {
          fontFamily: '"Press Start 2P"', fontSize: "10px", fill: "#44aaff",
        }).setOrigin(0.5)
        addPuzzleElement(strandText)

        // Answer display
        const answerText = scene.add.text(WIDTH / 2, HEIGHT / 2 - 100, "Answer: _", {
          fontFamily: '"Press Start 2P"', fontSize: "10px", fill: "#ffaa44",
        }).setOrigin(0.5)
        addPuzzleElement(answerText)

        // Base buttons
        const bases = ['A', 'T', 'C', 'G']
        bases.forEach((base, i) => {
          const x = WIDTH / 2 - 100 + i * 65
          const y = HEIGHT / 2 - 30

          const baseBg = addPuzzleElement(scene.add.rectangle(x, y, 55, 55, 0x444488)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true }), 6003)

          addPuzzleElement(scene.add.text(x, y, base, {
            fontFamily: '"Press Start 2P"', fontSize: "20px", fill: "#ffffff",
          }).setOrigin(0.5), 6004)

          baseBg.on("pointerdown", () => {
            if (playerAnswer.length < sequence.length) {
              playerAnswer.push(base)
              const display = playerAnswer.join(" ") + (playerAnswer.length < sequence.length ? " _" : "")
              answerText.setText("Answer: " + display)
            }
          })
        })

        // Clear button
        const clearBtn = addPuzzleElement(scene.add.rectangle(WIDTH / 2, HEIGHT / 2 + 50, 100, 35, 0x884444)
          .setStrokeStyle(2, 0xffffff)
          .setInteractive({ useHandCursor: true }), 6003)

        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 + 50, "CLEAR", {
          fontFamily: '"Press Start 2P"', fontSize: "8px", fill: "#ffffff",
        }).setOrigin(0.5), 6004)

        clearBtn.on("pointerdown", () => {
          playerAnswer.length = 0
          answerText.setText("Answer: _")
        })

        createConfirmButton(scene, () => {
          if (playerAnswer.length !== correct.length) return false
          return playerAnswer.join('') === correct.join('')
        }, HEIGHT / 2 + 120)
      }

      // PUZZLE TYPE 4: Mutation Detection
      function createMutationDetectionPuzzle(scene: any) {
        const original = generateDNASequence(Math.min(waveNumber, 8))
        const mutated = [...original]
        const mutationPos = Math.floor(Math.random() * original.length)
        const bases = ['A', 'T', 'C', 'G'].filter(b => b !== original[mutationPos])
        mutated[mutationPos] = bases[Math.floor(Math.random() * bases.length)]

        const title = scene.add.text(WIDTH / 2, HEIGHT / 2 - 200, "FIND MUTATION", {
          fontFamily: '"Press Start 2P"', fontSize: "12px", fill: "#ff4444",
          stroke: "#000000", strokeThickness: 3,
        }).setOrigin(0.5)
        addPuzzleElement(title)

        const subtitle = scene.add.text(WIDTH / 2, HEIGHT / 2 - 175, "Which base mutated?", {
          fontFamily: '"Press Start 2P"', fontSize: "7px", fill: "#ffffff",
        }).setOrigin(0.5)
        addPuzzleElement(subtitle)

        // Original
        scene.add.text(WIDTH / 2, HEIGHT / 2 - 140, "Original:", {
          fontFamily: '"Press Start 2P"', fontSize: "8px", fill: "#aaaaaa",
        }).setOrigin(0.5)
        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 115, original.join(" "), {
          fontFamily: '"Press Start 2P"', fontSize: "14px", fill: "#44ff44",
        }).setOrigin(0.5))

        // Mutated
        scene.add.text(WIDTH / 2, HEIGHT / 2 - 80, "Mutated:", {
          fontFamily: '"Press Start 2P"', fontSize: "8px", fill: "#aaaaaa",
        }).setOrigin(0.5)
        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 55, mutated.join(" "), {
          fontFamily: '"Press Start 2P"', fontSize: "14px", fill: "#ff4444",
        }).setOrigin(0.5))

        // Position buttons
        let selectedPos: number | null = null
        const posButtons: any[] = []

        original.forEach((_, i) => {
          const x = WIDTH / 2 - ((original.length - 1) * 25) + i * 50
          const y = HEIGHT / 2 + 20

          const posBg = addPuzzleElement(scene.add.rectangle(x, y, 40, 40, 0x444488)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true }), 6003)

          addPuzzleElement(scene.add.text(x, y, `${i + 1}`, {
            fontFamily: '"Press Start 2P"', fontSize: "14px", fill: "#ffffff",
          }).setOrigin(0.5), 6004)

          posButtons.push({ bg: posBg, pos: i })

          posBg.on("pointerdown", () => {
            selectedPos = i
            posButtons.forEach(btn => {
              btn.bg.setStrokeStyle(2, btn.pos === i ? 0x00ff00 : 0xffffff)
              btn.bg.setFillStyle(btn.pos === i ? 0x448844 : 0x444488)
            })
          })
        })

        createConfirmButton(scene, () => {
          if (selectedPos === null) return false
          return selectedPos === mutationPos
        })
      }

      // PUZZLE TYPE 5: Mutation Classification
      function createMutationClassificationPuzzle(scene: any) {
        const original = generateDNASequence(Math.min(waveNumber, 6))
        let mutated: string[]
        let correctType: string

        const rand = Math.random()
        if (rand < 0.4) {
          // Substitution
          mutated = [...original]
          const pos = Math.floor(Math.random() * original.length)
          const bases = ['A', 'T', 'C', 'G'].filter(b => b !== original[pos])
          mutated[pos] = bases[Math.floor(Math.random() * bases.length)]
          correctType = "SUBSTITUTION"
        } else if (rand < 0.7) {
          // Insertion
          mutated = [...original]
          const pos = Math.floor(Math.random() * original.length)
          const bases = ['A', 'T', 'C', 'G']
          mutated.splice(pos, 0, bases[Math.floor(Math.random() * 4)])
          correctType = "INSERTION"
        } else {
          // Deletion
          mutated = [...original]
          const pos = Math.floor(Math.random() * original.length)
          mutated.splice(pos, 1)
          correctType = "DELETION"
        }

        const title = scene.add.text(WIDTH / 2, HEIGHT / 2 - 200, "MUTATION TYPE", {
          fontFamily: '"Press Start 2P"', fontSize: "12px", fill: "#ff4444",
          stroke: "#000000", strokeThickness: 3,
        }).setOrigin(0.5)
        addPuzzleElement(title)

        const subtitle = scene.add.text(WIDTH / 2, HEIGHT / 2 - 175, "What mutation occurred?", {
          fontFamily: '"Press Start 2P"', fontSize: "7px", fill: "#ffffff",
        }).setOrigin(0.5)
        addPuzzleElement(subtitle)

        // Show strands
        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 140, "Original: " + original.join(" "), {
          fontFamily: '"Press Start 2P"', fontSize: "9px", fill: "#44ff44",
        }).setOrigin(0.5))

        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 110, "Mutated: " + mutated.join(" "), {
          fontFamily: '"Press Start 2P"', fontSize: "9px", fill: "#ff4444",
        }).setOrigin(0.5))

        // Type options
        const types = ["SUBSTITUTION", "INSERTION", "DELETION"]
        let selectedType: string | null = null
        const typeButtons: any[] = []

        types.forEach((type, i) => {
          const y = HEIGHT / 2 - 50 + i * 50
          const typeBg = addPuzzleElement(scene.add.rectangle(WIDTH / 2, y, 220, 38, 0x444488)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true }), 6003)

          addPuzzleElement(scene.add.text(WIDTH / 2, y, type, {
            fontFamily: '"Press Start 2P"', fontSize: "10px", fill: "#ffffff",
          }).setOrigin(0.5), 6004)

          typeButtons.push({ bg: typeBg, type })

          typeBg.on("pointerdown", () => {
            selectedType = type
            typeButtons.forEach(btn => {
              btn.bg.setStrokeStyle(2, btn.type === type ? 0x00ff00 : 0xffffff)
              btn.bg.setFillStyle(btn.type === type ? 0x448844 : 0x444488)
            })
          })
        })

        createConfirmButton(scene, () => {
          if (selectedType === null) return false
          return selectedType === correctType
        })
      }

      // PUZZLE TYPE 6: RNA Mode
      function createRNAModePuzzle(scene: any) {
        const sequence = generateDNASequence(waveNumber)
        const correct = getComplement(sequence, true) // RNA uses U instead of T

        const title = scene.add.text(WIDTH / 2, HEIGHT / 2 - 200, "RNA TRANSCRIPTION", {
          fontFamily: '"Press Start 2P"', fontSize: "10px", fill: "#ff44ff",
          stroke: "#000000", strokeThickness: 3,
        }).setOrigin(0.5)
        addPuzzleElement(title)

        const subtitle = scene.add.text(WIDTH / 2, HEIGHT / 2 - 175, "RNA uses U not T!", {
          fontFamily: '"Press Start 2P"', fontSize: "7px", fill: "#ffff00",
        }).setOrigin(0.5)
        addPuzzleElement(subtitle)

        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 140, "DNA: " + sequence.join(" "), {
          fontFamily: '"Press Start 2P"', fontSize: "12px", fill: "#44aaff",
        }).setOrigin(0.5))

        // Generate options
        const options = [correct]
        // Wrong: DNA complement (has T instead of U)
        options.push(getComplement(sequence, false))
        // Wrong: random mutation
        const wrong = generateWrongAnswer(correct)
        options.push(wrong)
        options.sort(() => Math.random() - 0.5)

        let selectedOption: number | null = null
        const optButtons: any[] = []

        options.forEach((opt, i) => {
          const y = HEIGHT / 2 - 70 + i * 55
          const optBg = addPuzzleElement(scene.add.rectangle(WIDTH / 2, y, 260, 42, 0x663366)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true }), 6003)

          addPuzzleElement(scene.add.text(WIDTH / 2, y, opt.join(" "), {
            fontFamily: '"Press Start 2P"', fontSize: "12px", fill: "#ffffff",
          }).setOrigin(0.5), 6004)

          optButtons.push({ bg: optBg, option: opt })

          optBg.on("pointerdown", () => {
            selectedOption = i
            optButtons.forEach((btn, idx) => {
              btn.bg.setStrokeStyle(2, idx === i ? 0x00ff00 : 0xffffff)
              btn.bg.setFillStyle(idx === i ? 0x446644 : 0x663366)
            })
          })
        })

        createConfirmButton(scene, () => {
          if (selectedOption === null) return false
          return options[selectedOption].join('') === correct.join('')
        })
      }

      // PUZZLE TYPE 7: Stability (GC content)
      function createStabilityPuzzle(scene: any) {
        // Generate two sequences with different GC content
        const lowGC = ['A', 'T', 'A', 'T', 'A', 'T'].sort(() => Math.random() - 0.5)
        const highGC = ['G', 'C', 'G', 'C', 'A', 'G'].sort(() => Math.random() - 0.5)
        const sequences = [lowGC, highGC].sort(() => Math.random() - 0.5)
        const correctIndex = sequences.indexOf(highGC)

        const title = scene.add.text(WIDTH / 2, HEIGHT / 2 - 200, "VIRUS STABILITY", {
          fontFamily: '"Press Start 2P"', fontSize: "11px", fill: "#ff4444",
          stroke: "#000000", strokeThickness: 3,
        }).setOrigin(0.5)
        addPuzzleElement(title)

        const subtitle = scene.add.text(WIDTH / 2, HEIGHT / 2 - 170, "G-C bonds are stronger!", {
          fontFamily: '"Press Start 2P"', fontSize: "6px", fill: "#ffff00",
        }).setOrigin(0.5)
        addPuzzleElement(subtitle)

        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 140, "Which is MORE stable?", {
          fontFamily: '"Press Start 2P"', fontSize: "8px", fill: "#ffffff",
        }).setOrigin(0.5))

        let selectedSeq: number | null = null
        const seqButtons: any[] = []

        sequences.forEach((seq, i) => {
          const y = HEIGHT / 2 - 70 + i * 70
          const seqBg = addPuzzleElement(scene.add.rectangle(WIDTH / 2, y, 260, 50, 0x336666)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true }), 6003)

          addPuzzleElement(scene.add.text(WIDTH / 2, y, seq.join(" "), {
            fontFamily: '"Press Start 2P"', fontSize: "14px", fill: "#ffffff",
          }).setOrigin(0.5), 6004)

          seqButtons.push({ bg: seqBg, index: i })

          seqBg.on("pointerdown", () => {
            selectedSeq = i
            seqButtons.forEach(btn => {
              btn.bg.setStrokeStyle(3, btn.index === i ? 0x00ff00 : 0xffffff)
              btn.bg.setFillStyle(btn.index === i ? 0x448844 : 0x336666)
            })
          })
        })

        createConfirmButton(scene, () => {
          if (selectedSeq === null) return false
          return selectedSeq === correctIndex
        })
      }

      // PUZZLE TYPE 8: Virus Adaptation
      function createAdaptationPuzzle(scene: any) {
        const scenarios = [
          {
            text: "Zombies are dying\nfrom headshots",
            options: ["Thicker skull", "Faster legs", "More saliva"],
            correct: 0
          },
          {
            text: "Survivors use\nfire attacks",
            options: ["Heat resistance", "Bigger claws", "Better hearing"],
            correct: 0
          },
          {
            text: "Zombies can't see\nin darkness",
            options: ["Better smell", "Louder groans", "Softer skin"],
            correct: 0
          },
          {
            text: "Humans hide in\ntall buildings",
            options: ["Wall climbing", "Acid spit", "Faster decay"],
            correct: 0
          },
          {
            text: "Cold weather is\nkilling zombies",
            options: ["Antifreeze blood", "Bigger teeth", "Glowing eyes"],
            correct: 0
          }
        ]

        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]

        const title = scene.add.text(WIDTH / 2, HEIGHT / 2 - 200, "VIRUS EVOLUTION", {
          fontFamily: '"Press Start 2P"', fontSize: "11px", fill: "#ff4444",
          stroke: "#000000", strokeThickness: 3,
        }).setOrigin(0.5)
        addPuzzleElement(title)

        const subtitle = scene.add.text(WIDTH / 2, HEIGHT / 2 - 175, "Natural selection!", {
          fontFamily: '"Press Start 2P"', fontSize: "7px", fill: "#ffff00",
        }).setOrigin(0.5)
        addPuzzleElement(subtitle)

        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 130, scenario.text, {
          fontFamily: '"Press Start 2P"', fontSize: "9px", fill: "#ffffff",
          align: "center", lineSpacing: 8,
        }).setOrigin(0.5))

        addPuzzleElement(scene.add.text(WIDTH / 2, HEIGHT / 2 - 70, "Best adaptation?", {
          fontFamily: '"Press Start 2P"', fontSize: "8px", fill: "#aaaaaa",
        }).setOrigin(0.5))

        // Shuffle options but track correct
        const shuffledOptions = scenario.options.map((opt, i) => ({ text: opt, isCorrect: i === scenario.correct }))
        shuffledOptions.sort(() => Math.random() - 0.5)

        let selectedOpt: number | null = null
        const optBtns: any[] = []

        shuffledOptions.forEach((opt, i) => {
          const y = HEIGHT / 2 - 20 + i * 50
          const optBg = addPuzzleElement(scene.add.rectangle(WIDTH / 2, y, 240, 40, 0x664444)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true }), 6003)

          addPuzzleElement(scene.add.text(WIDTH / 2, y, opt.text, {
            fontFamily: '"Press Start 2P"', fontSize: "9px", fill: "#ffffff",
          }).setOrigin(0.5), 6004)

          optBtns.push({ bg: optBg, isCorrect: opt.isCorrect, index: i })

          optBg.on("pointerdown", () => {
            selectedOpt = i
            optBtns.forEach(btn => {
              btn.bg.setStrokeStyle(2, btn.index === i ? 0x00ff00 : 0xffffff)
              btn.bg.setFillStyle(btn.index === i ? 0x448844 : 0x664444)
            })
          })
        })

        createConfirmButton(scene, () => {
          if (selectedOpt === null) return false
          return shuffledOptions[selectedOpt].isCorrect
        })
      }

      // Helper: Create confirm button
      function createConfirmButton(scene: any, checkAnswer: () => boolean, yPos = HEIGHT / 2 + 180) {
        const confirmBtn = scene.add.rectangle(WIDTH / 2, yPos, 120, 40, 0x44aa44)
          .setStrokeStyle(3, 0xffffff)
          .setScrollFactor(0)
          .setDepth(6005)
          .setInteractive({ useHandCursor: true })
        puzzleElements.push(confirmBtn)

        const confirmText = scene.add.text(WIDTH / 2, yPos, "CONFIRM", {
          fontFamily: '"Press Start 2P"', fontSize: "10px", fill: "#ffffff",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6006)
        puzzleElements.push(confirmText)

        let selectTimer: any = null

        confirmBtn.on("pointerdown", () => {
          const result = checkAnswer()

          if (result === false && confirmText.text === "CONFIRM") {
            confirmText.setText("SELECT!")
            // Clear any existing timer
            if (selectTimer) selectTimer.remove()
            selectTimer = scene.time.addEvent({
              delay: 1000,
              callback: () => {
                // Check if text element still exists before updating
                if (confirmText && confirmText.active) {
                  confirmText.setText("CONFIRM")
                }
              }
            })
            return
          }

          // Clear timer before destroying elements
          if (selectTimer) selectTimer.remove()

          // Destroy all puzzle elements
          puzzleElements.forEach(el => el.destroy())
          puzzleElements = []
          isPuzzleActive = false

          if (result) {
            showWaveCleared(scene)
          } else {
            showInfected(scene)
          }
        })
      }

      // Infection modal - shown when puzzle answer is wrong
      function showInfected(scene: any) {
        mutationMeter = 0
        
        // Track modal elements for cleanup
        const infectedElements: any[] = []
        
        // Dark background - directly to scene
        const infectedBg = scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.8)
          .setScrollFactor(0)
          .setDepth(6000)
          .setInteractive() // Block clicks behind
        infectedElements.push(infectedBg)
        
        // Shop background
        const infectedBoard = scene.add.image(WIDTH / 2, HEIGHT / 2, "shopbg")
          .setDisplaySize(340, 380)
          .setScrollFactor(0)
          .setDepth(6001)
        infectedElements.push(infectedBoard)
        
        // Infected title
        const infectedTitle = scene.add.text(WIDTH / 2, HEIGHT / 2 - 110, "INFECTED!", {
          fontFamily: '"Press Start 2P"',
          fontSize: "20px",
          fill: "#ff4444",
          stroke: "#000000",
          strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        infectedElements.push(infectedTitle)
        
        // Message
        const msgText = scene.add.text(WIDTH / 2, HEIGHT / 2 - 50, "You are infected!", {
          fontFamily: '"Press Start 2P"',
          fontSize: "14px",
          fill: "#ffffff",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        infectedElements.push(msgText)
        
        // Warning text
        const warningText = scene.add.text(WIDTH / 2, HEIGHT / 2, "You will lose health", {
          fontFamily: '"Press Start 2P"',
          fontSize: "12px",
          fill: "#ff6666",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        infectedElements.push(warningText)
        
        // Health drain info
        const drainText = scene.add.text(WIDTH / 2, HEIGHT / 2 + 40, "-5% HP every second", {
          fontFamily: '"Press Start 2P"',
          fontSize: "10px",
          fill: "#ffaa00",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        infectedElements.push(drainText)
        
        // Continue button - red style
        const continueBtn = scene.add.rectangle(WIDTH / 2, HEIGHT / 2 + 110, 180, 50, 0xaa4444)
          .setStrokeStyle(3, 0xffffff)
          .setScrollFactor(0)
          .setDepth(7000)
          .setInteractive({ useHandCursor: true })
        infectedElements.push(continueBtn)
        
        const continueText = scene.add.text(WIDTH / 2, HEIGHT / 2 + 110, "CONTINUE", {
          fontFamily: '"Press Start 2P"',
          fontSize: "12px",
          fill: "#ffffff",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(7001)
        infectedElements.push(continueText)
        
        // Button hover effect
        continueBtn.on("pointerover", () => {
          continueBtn.setFillStyle(0xcc5555)
        })
        continueBtn.on("pointerout", () => {
          continueBtn.setFillStyle(0xaa4444)
        })
        
        continueBtn.on("pointerdown", () => {
          // Destroy all modal elements
          infectedElements.forEach(el => el.destroy())
          
          // Reset puzzle state so game can continue
          isPuzzleActive = false
          currentWaveCleared = false
          
          // Start health drain - 5% (5 HP) every second
          scene.time.addEvent({
            delay: 1000,
            callback: () => {
              if (!gameOver && health > 0) {
                health = Math.max(0, health - 5) // 5% of 100 max health
                // Red flash to show damage
                scene.cameras.main.flash(100, 255, 0, 0)
              }
            },
            loop: true
          })
        })
      }

      function showWaveCleared(scene: any) {
        currentWaveCleared = true
        mutationMeter = 0

        // Track modal elements for cleanup
        const successElements: any[] = []

        // Dark background - directly to scene
        const successBg = scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.8)
          .setScrollFactor(0)
          .setDepth(6000)
          .setInteractive() // Block clicks behind
        successElements.push(successBg)

        // Shop background - BIGGER
        const successBoard = scene.add.image(WIDTH / 2, HEIGHT / 2, "shopbg")
          .setDisplaySize(340, 380)
          .setScrollFactor(0)
          .setDepth(6001)
        successElements.push(successBoard)

        // Success title - INFECTION SURVIVED - BIGGER
        const successTitle = scene.add.text(WIDTH / 2, HEIGHT / 2 - 110, "INFECTION", {
          fontFamily: '"Press Start 2P"',
          fontSize: "18px",
          fill: "#44ff44",
          stroke: "#000000",
          strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        successElements.push(successTitle)

        const survivedText = scene.add.text(WIDTH / 2, HEIGHT / 2 - 70, "SURVIVED!", {
          fontFamily: '"Press Start 2P"',
          fontSize: "20px",
          fill: "#44ff44",
          stroke: "#000000",
          strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        successElements.push(survivedText)

        // OG message - BIGGER
        const ogText = scene.add.text(WIDTH / 2, HEIGHT / 2 - 20, "You are the OG", {
          fontFamily: '"Press Start 2P"',
          fontSize: "14px",
          fill: "#ffffff",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        successElements.push(ogText)

        // Bonus score text - BIGGER
        const bonusText = scene.add.text(WIDTH / 2, HEIGHT / 2 + 30, "+50 Score!", {
          fontFamily: '"Press Start 2P"',
          fontSize: "14px",
          fill: "#ffff00",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(6002)
        successElements.push(bonusText)

        // Add bonus score
        score += 50

        // Continue button - BIGGER and properly interactive
        const continueBtn = scene.add.rectangle(WIDTH / 2, HEIGHT / 2 + 100, 180, 50, 0x44aa44)
          .setStrokeStyle(3, 0xffffff)
          .setScrollFactor(0)
          .setDepth(7000) // Very high depth to be on top of everything
          .setInteractive({ useHandCursor: true })
        successElements.push(continueBtn)

        const continueText = scene.add.text(WIDTH / 2, HEIGHT / 2 + 100, "CONTINUE", {
          fontFamily: '"Press Start 2P"',
          fontSize: "12px",
          fill: "#ffffff",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(7001)
        successElements.push(continueText)

        // Button hover effect
        continueBtn.on("pointerover", () => {
          continueBtn.setFillStyle(0x55cc55)
        })
        continueBtn.on("pointerout", () => {
          continueBtn.setFillStyle(0x44aa44)
        })

        continueBtn.on("pointerdown", () => {
          console.log("SUCCESS CONTINUE CLICKED - Resuming game")

          // Destroy all modal elements
          successElements.forEach(el => el.destroy())

          // Ensure puzzle state is reset so game can continue
          isPuzzleActive = false
          currentWaveCleared = false // Allow new puzzles in next wave

          console.log("Game resumed after success")
        })
      }

      // Scene classes
      class BootScene extends window.Phaser.Scene {
        constructor() {
          super({ key: "BootScene" })
        }

        preload() {
          this.load.image(
            "splashbg",
            "/images/splashbg1.png",
          )
          this.load.image(
            "logo",
            "/images/killz.png",
          )
          this.load.image(
            "playbutton",
            "/images/play.png",
          )
          this.load.image(
            "solvepuzzle",
            "/images/solvepuzzle.png",
          )
          this.load.audio(
            "splashhit",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/d49b9f90-d0b7-420d-9c69-0758ead52b36/scream-RuiXF9iytmzRnMp2mx3oOWgTmq0vLm.mp3?vVNt",
          )
        }

        create() {
          this.scene.start("LoadingScene")
        }
      }

      class LoadingScene extends window.Phaser.Scene {
        loadFontPromise: Promise<FontFace[]>

        constructor() {
          super({ key: "LoadingScene" })
          this.loadFontPromise = Promise.resolve([])
        }

        preload() {
          this.loadFontPromise = document.fonts.load('16px "Press Start 2P"')

          const { width, height } = this.cameras.main
          this.add
            .image(width / 2, height / 2, "splashbg")
            .setOrigin(0.5)
            .setDepth(0)

          loadingText = this.add
            .text(width / 2, height / 2, "Loading...", {
              fontFamily: '"Press Start 2P"',
              fontSize: "18px",
              fill: "#ffffff",
              stroke: "#000000",
              strokeThickness: 4,
              shadow: { offsetX: 2, offsetY: 2, color: "#000000", blur: 4, stroke: true, fill: true }
            })
            .setOrigin(0.5)

          // Load all game assets
          this.load.spritesheet(
            "survivor",
            "/images/soldier.png",
            { frameWidth: 135, frameHeight: 145 },
          )
          this.load.image(
            "gun",
            "/images/pistol1.png",
          )
          this.load.image(
            "shotgun",
            "/images/shotgun1.png",
          )
          this.load.spritesheet(
            "zombie",
            "/images/zombie.png",
            { frameWidth: 100, frameHeight: 144 },
          )
          this.load.spritesheet(
            "zombiekid",
            "/images/kid.png",
            { frameWidth: 132, frameHeight: 132 },
          )
          this.load.spritesheet(
            "zombiegiant",
            "/images/giant.png",
            { frameWidth: 144, frameHeight: 146 },
          )
          this.load.spritesheet(
            "money",
            "/images/coinusd.png",
            { frameWidth: 131, frameHeight: 131 },
          )
          this.load.spritesheet(
            "shop",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/truckguy-EKmMSt0XgUhqaFEDqMQQeHSehBlhb9.png?s2cZ",
            { frameWidth: 96, frameHeight: 48 },
          )
          this.load.spritesheet(
            "radio",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/radio-27cMtZihsDAJyDWwvzJ9rGUAkBomfm.png?q3eq",
            { frameWidth: 32, frameHeight: 32 },
          )
          this.load.spritesheet(
            "shopclose",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/shoptruckleaving-1FToNB9EtVEdIWtIEuEZVT787ZXBNe.png?xQ11",
            { frameWidth: 96, frameHeight: 48 },
          )
          this.load.image(
            "terrainsurvivor",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/terrainsurvivor-tr9cDqoXi3ZsnajJkw63YRA27iwEG7.png?B4eZ",
          )
          this.load.image(
            "navbarbg",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/topbarfinal-bPdySb2grp0Sp7z1hZabV29u1kSNqY.png?6FcE",
          )
          this.load.image(
            "shopbg",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/shopbg-vzL64tCxHOmX7nxuP20Xmr7i55aDlf.png?OfTq",
          )
          this.load.image(
            "shopstimmy",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/stimmyr-UOikiWqGO7tozwZuYgINshpmlb59sp.png?1Jm2",
          )
          this.load.image(
            "shopshotgun",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/shotgunselect-pPNwe52zg9CSybsKrPNvuuZMMvMgsw.png?KI9s",
          )
          this.load.tilemapTiledJSON("map", "https://jsonkeeper.com/b/J1ADX")

          // Scale bullet and particle sizes with terrain
          createCircleTexture(this, "bullet", Math.round(3 * TERRAIN_SCALE), 0xffff99, 0xcaa800)
          createCircleTexture(this, "blood", Math.round(3 * TERRAIN_SCALE), 0xff0000, 0xff0000)
          createCircleTexture(this, "yellowParticle", Math.round(3 * TERRAIN_SCALE), 0xffff00, 0xffff00)
          createCircleTexture(this, "joystickHandleTexture", 20, 0x999999, 0x999999)

          this.load.image(
            "sun",
            "/images/sun.png",
          )
          this.load.image(
            "moon",
            "/images/moon.png",
          )
          this.load.image(
            "heart",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/heart-KrXOzbLpzjLTlIKs2Rz6UxoyWfDs7a.png?9oEu",
          )
          this.load.image(
            "vision",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/fowfixed-JI2DInYTvPixjZxn0piXhFRpJdZddx.png?M3cZ",
          )
          this.load.image(
            "exitbutton",
            "/images/exit.png",
          )
          this.load.image(
            "leaderboardbutton",
            "/images/leaderboard.png",
          )
          this.load.image(
            "claimbutton",
            "/images/claim.png",
          )
          this.load.image(
            "claimedbutton",
            "/images/claimed.png",
          )
          this.load.spritesheet(
            "chest",
            "/images/chest.png",
            { frameWidth: 216, frameHeight: 216 },
          )

          // Coin images for claim reward
          this.load.image("coin_pratzyy", "/images/pratzyy1.png")
          this.load.image("coin_bhadoriya", "/images/bhadoriya1.png")
          this.load.image("coin_jesse", "/images/jesse1.png")

          // Audio
          this.load.audio(
            "music",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/horrormusic-N2NeuhKFMSnTEC2QS8mH5i21IpJxT0.mp3?SMuE",
          )
          this.load.audio(
            "zombiehit1",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/zombiehit1-kuLoy9tbmHPelcm3W3HKZhQIiSfjZL.mp3?DZxX",
          )
          this.load.audio(
            "zombiehit2",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/zombiehit2-RKwHbKDgMNAFVXtekazEaU6hXvzVnU.mp3?BTzC",
          )
          this.load.audio(
            "zombiehit3",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/zombiehit3-yFVe9Mw4tKr44vdXBQh0VvBZ20G5Kh.mp3?R1jH",
          )
          this.load.audio(
            "zombiehit4",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/zombiehit4-SLu6q1LsgnWrN1N0oitFQJWN1YwXJd.mp3?3a1v",
          )
          this.load.audio(
            "running",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/Random7-CB1oXa48PhnBwG44dttWvFziEuOQwU.wav?urry",
          )
          this.load.audio(
            "bonecrack",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/bonecrack-DfN5qb0yDW3JUUHT14Z8ohxthh4KKY.mp3?y8BD",
          )
          this.load.audio(
            "pistolshoot1",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/pistol1-Q4qOMUDw6yVjzmgFNgLwF2cxU9YhFI.mp3?ESeG",
          )
          this.load.audio(
            "pistolshoot2",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/pistol2-Utx4Ef7zwd6npjWyTZVHAdAOLxtwdY.mp3?epl3",
          )
          this.load.audio(
            "pistolshoot3",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/pistol3-VYJIImVilGOQWmq6BMrjaDcAtXDg9L.mp3?NvWq",
          )
          this.load.audio(
            "shopkeeper1",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/shopkeeper1-F6KHzhvUueHry2mVqblkw568Xw8MX4.mp3?nGit",
          )
          this.load.audio(
            "shopkeeper2",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/shopkeeper2-vfdkpiVLxKDkCmW3Pl5Ua5r21T5hGK.mp3?kzy1",
          )
          this.load.audio(
            "shopkeeper3",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/shopkeeper3-b9aPyVEqlZqLOuG2Z6l395NBTStVbE.mp3?web2",
          )
          this.load.audio(
            "cashregister",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/cashregister-4AJMBjrLlYxeREwfaKm4oeL5rqY7nE.mp3?FUtb",
          )
          this.load.audio(
            "moneypickup",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/moneypickup-ctCEdsA6PnHHfphHGVURtza5VOoYRN.mp3?UIPR",
          )
          this.load.audio(
            "playerhit",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/playegettinghit-D6HE3AYYHqz7ejMWzi1B16Z1OIcuhN.mp3?tH9K",
          )
          this.load.audio(
            "playerdeath",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/deathscream-4VKlRAbXgXoJ6CvjEXX4CD53eRSTBM.mp3?3cJ1",
          )
          this.load.audio(
            "radiostatic",
            "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/cec49d06-d4f3-41ea-90fc-fe0a5220600e/staticradio-4K6MkKQg6xMFFq3RQQfCbBH32nbdCk.mp3?eWvO",
          )
          this.load.audio(
            "chestopeningcoc",
            "/images/chestopeningcoc.mp3",
          )

          this.load.on("progress", (value: number) => {
            loadingText.setText(`Loading... ${Math.round(value * 100)}%`)
          })
        }

        async create() {
          const { width, height } = this.cameras.main
          this.sound.play("splashhit", { volume: 0.7 })
          this.add
            .image(width / 2, height / 2, "splashbg")
            .setOrigin(0.5)
            .setDepth(0)

          await this.loadFontPromise

          if (loadingText) loadingText.destroy()

          const logo = this.add.image(width / 2, height / 2 - 180, "logo").setOrigin(0.5).setDisplaySize(200, 115)

          const startBtn = this.add
            .image(width / 2, height / 2 - 30, "playbutton")
            .setOrigin(0.5)
            .setInteractive()
            .setDisplaySize(180, 50)

          // Loading text for transaction
          const txLoadingText = this.add
            .text(width / 2, height / 2 - 30, "Confirming...", {
              fontFamily: '"Press Start 2P"',
              fontSize: "14px",
              fill: "#ffffff",
              align: "center",
              stroke: "#000000",
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(200)
            .setVisible(false)

          // Error text for failed transaction
          const txErrorText = this.add
            .text(width / 2, height / 2 + 10, "", {
              fontFamily: '"Press Start 2P"',
              fontSize: "10px",
              fill: "#ff4444",
              align: "center",
              stroke: "#000000",
              strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setDepth(200)
            .setVisible(false)

          startBtn.on("pointerdown", async () => {
            if (this.sound.context.state === "suspended") {
              this.sound.context.resume()
            }

            // Show loading state
            startBtn.setVisible(false)
            txLoadingText.setVisible(true)
            txErrorText.setVisible(false)

            try {
              let txSuccess = false

              // Use Farcaster Mini App SDK's ethereum provider (native Farcaster wallet)
              const provider = await sdk.wallet.getEthereumProvider()

              if (provider) {
                // Request accounts first
                const accounts = await provider.request({ method: 'eth_requestAccounts' })
                if (accounts && accounts.length > 0) {
                  const userAddress = accounts[0]
                  // Send 0-value transaction on Base chain
                  const txHash = await provider.request({
                    method: 'eth_sendTransaction',
                    params: [{
                      from: userAddress,
                      to: userAddress, // Send to self (0 value)
                      value: "0x0", // 0 ETH
                      data: "0x", // Empty data
                      chainId: "0x2105", // Base chain
                    }],
                  })

                  if (txHash) {
                    console.log("Transaction confirmed:", txHash)
                    txSuccess = true
                  }
                }
              } else {
                // No wallet available
                txErrorText.setText("No wallet found!")
                txErrorText.setVisible(true)
                txLoadingText.setVisible(false)
                startBtn.setVisible(true)
                return
              }

              // Only start game if transaction was successful
              if (txSuccess) {
                // Show "Starting Game..." text before transitioning
                txLoadingText.setText("Starting Game...")
                txLoadingText.setVisible(true)

                // Store scene reference for setTimeout callback
                const scene = this

                // Wait 1.5 seconds then start the game
                setTimeout(() => {
                  if (scene.sound.context.state === "suspended") {
                    scene.sound.context.resume()
                  }
                  scene.sound.play("playerdeath")
                  scene.scene.start("GameScene")
                }, 1500)
              } else {
                txErrorText.setText("Transaction failed")
                txErrorText.setVisible(true)
                txLoadingText.setVisible(false)
                startBtn.setVisible(true)
              }
            } catch (error: any) {
              console.log("Transaction failed or cancelled:", error)
              // Show error and restore play button
              const errorMsg = error.code === 4001 ? "Transaction\ncancelled" : "Transaction\nfailed"
              txErrorText.setText(errorMsg)
              txErrorText.setVisible(true)
              txLoadingText.setVisible(false)
              startBtn.setVisible(true)
            }
          })

          // Leaderboard button
          const leaderboardBtn = this.add
            .image(width / 2, height / 2 + 35, "leaderboardbutton")
            .setOrigin(0.5)
            .setInteractive()
            .setDisplaySize(180, 50)

          // Leaderboard overlay elements (hidden initially)
          const leaderboardBgBlack = this.add
            .rectangle(0, 0, width, height, 0x000000, 0.9)
            .setOrigin(0)
            .setDepth(100)
            .setVisible(false)

          const leaderboardBg = this.add
            .image(width / 2, height / 2, "shopbg")
            .setOrigin(0.5)
            .setDepth(101)
            .setDisplaySize(320, 400)
            .setVisible(false)

          const leaderboardTitle = this.add
            .text(width / 2, height / 2 - 140, "LEADERBOARD", {
              fontFamily: '"Press Start 2P"',
              fontSize: "16px",
              fill: "#ffffff",
              align: "center",
              stroke: "#000000",
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(102)
            .setVisible(false)

          const leaderboardHeader = this.add
            .text(width / 2, height / 2 - 95, "NAME          SCORE GAMES", {
              fontFamily: '"Press Start 2P"',
              fontSize: "8px",
              fill: "#ffff00",
              align: "center",
            })
            .setOrigin(0.5)
            .setDepth(102)
            .setVisible(false)

          // Loading text for leaderboard
          const leaderboardLoading = this.add
            .text(width / 2, height / 2, "Loading...", {
              fontFamily: '"Press Start 2P"',
              fontSize: "10px",
              fill: "#ffffff",
              align: "center",
            })
            .setOrigin(0.5)
            .setDepth(102)
            .setVisible(false)

          // Container for dynamic leaderboard entries
          let leaderboardEntries: any[] = []
          const scene = this

          const leaderboardCloseBtn = this.add
            .image(width / 2, height / 2 + 140, "exitbutton")
            .setOrigin(0.5)
            .setInteractive()
            .setDisplaySize(140, 39)
            .setDepth(102)
            .setVisible(false)

          // Show leaderboard on button click - fetch from Firestore
          leaderboardBtn.on("pointerdown", async () => {
            leaderboardBgBlack.setVisible(true)
            leaderboardBg.setVisible(true)
            leaderboardTitle.setVisible(true)
            leaderboardHeader.setVisible(true)
            leaderboardLoading.setVisible(true)
            leaderboardCloseBtn.setVisible(true)

            // Clear old entries
            leaderboardEntries.forEach(entry => entry.destroy())
            leaderboardEntries = []

            try {
              // Fetch top 5 players from Firestore
              const players = await getTopPlayers(5)

              leaderboardLoading.setVisible(false)

              if (players.length === 0) {
                const noDataText = scene.add
                  .text(width / 2, height / 2, "No scores yet!", {
                    fontFamily: '"Press Start 2P"',
                    fontSize: "10px",
                    fill: "#ffffff",
                    align: "center",
                  })
                  .setOrigin(0.5)
                  .setDepth(102)
                leaderboardEntries.push(noDataText)
              } else {
                players.forEach((player, index) => {
                  const rank = index + 1
                  const nameStr = (player.username || player.address.slice(0, 8)).substring(0, 10).padEnd(10)
                  const scoreStr = String(player.totalScore).padStart(5)
                  const gamesStr = String(player.gamesPlayed).padStart(2)
                  const entryText = scene.add
                    .text(
                      width / 2,
                      height / 2 - 55 + index * 40,
                      `${rank}. ${nameStr} ${scoreStr}  ${gamesStr}`,
                      {
                        fontFamily: '"Press Start 2P"',
                        fontSize: "8px",
                        fill: "#ffffff",
                        align: "center",
                      }
                    )
                    .setOrigin(0.5)
                    .setDepth(102)
                  leaderboardEntries.push(entryText)
                })
              }
            } catch (error) {
              console.error("Error fetching leaderboard:", error)
              leaderboardLoading.setText("Error loading")
            }
          })

          // Hide leaderboard on close
          leaderboardCloseBtn.on("pointerdown", () => {
            leaderboardBgBlack.setVisible(false)
            leaderboardBg.setVisible(false)
            leaderboardTitle.setVisible(false)
            leaderboardHeader.setVisible(false)
            leaderboardLoading.setVisible(false)
            leaderboardEntries.forEach(entry => entry.destroy())
            leaderboardEntries = []
            leaderboardCloseBtn.setVisible(false)
          })

          this.add
            .text(width / 2, height - 130, "Use arrow keys / joystick to move.", {
              fontFamily: '"Press Start 2P"',
              fontSize: "10px",
              fill: "#ffffff",
              align: "center",
              lineSpacing: 6,
            })
            .setOrigin(0.5)

          const instructionText = this.add
            .text(
              width / 2,
              height - 80,
              "Stake ETH and survive!\nThe longer you survive,\nthe more creator coins you earn\nfrom your favourite creators.",
              {
                fontFamily: '"Press Start 2P"',
                fontSize: "10px",
                fill: "#ffffff",
                align: "center",
                lineSpacing: 8,
                stroke: "#000000",
                strokeThickness: 3,
              },
            )
            .setOrigin(0.5)
          instructionText.setShadow(2, 2, "#000000", 2, true, true)
        }
      }

      // Add the massive GameScene class - this will be very long, so I'll continue in the next part...
      // For now, let's create a basic game scene structure

      class GameScene extends window.Phaser.Scene {
        vision: any
        zombieMask: any
        fogMask: any

        constructor() {
          super({ key: "GameScene" })
        }

        preload() {
          this.load.scenePlugin(
            "AnimatedTiles",
            "https://raw.githubusercontent.com/nkholski/phaser-animated-tiles/master/dist/AnimatedTiles.js",
            "animatedTiles",
            "animatedTiles",
          )
        }

        create() {
          // Resume audio context if suspended (can happen after async transaction)
          if (this.sound.context.state === "suspended") {
            this.sound.context.resume()
          }

          if (window.FarcadeSDK) {
            window.FarcadeSDK.singlePlayer.actions.ready()
          }

          // Initialize the game - this would contain all the game setup from the original HTML
          // For brevity, I'll add the essential parts and mark where the full implementation would go

          // Create map and layers
          const map = this.make.tilemap({ key: "map" })
          const tileset = map.addTilesetImage("terrainsurvivor", "terrainsurvivor")
          const groundLayer = map.createLayer("Ground", tileset, 0, 0).setScale(TERRAIN_SCALE)
          const fenceLayer = map.createLayer("Fence", tileset, 0, 0).setScale(TERRAIN_SCALE)
          fenceLayer.setCollisionByProperty({ collides: true })
          const buildingsLayer = map.createLayer("Buildings", tileset, 0, 0).setDepth(3).setScale(TERRAIN_SCALE)
          buildingsLayer.setCollisionByProperty({ collides: true })
          const buildingsAbove = map.createLayer("BuildingsAbove", tileset, 0, 0).setDepth(4).setScale(TERRAIN_SCALE)
          const treesLayer = map.createLayer("Trees", tileset, 0, 0).setScale(TERRAIN_SCALE)
          const signsLayer = map.createLayer("Signs", tileset, 0, 0).setScale(TERRAIN_SCALE)
          const fieldsLayer = map.createLayer("Fields", tileset, 0, 0).setScale(TERRAIN_SCALE)
          const windmillLayer = map.createLayer("Windmill", tileset, 0, 0).setScale(TERRAIN_SCALE)
          const accentsLayer = map.createLayer("Accents", tileset, 0, 0).setScale(TERRAIN_SCALE)
          const carsLayer = map.createLayer("Cars", tileset, 0, 0).setScale(TERRAIN_SCALE)
          carsLayer.setCollisionByProperty({ collides: true })

          // @ts-ignore
          this.animatedTiles.init(map)

          // Adjust camera and world bounds for scaled map
          const scaledMapWidth = map.widthInPixels * TERRAIN_SCALE
          const scaledMapHeight = map.heightInPixels * TERRAIN_SCALE
          this.cameras.main.setBounds(0, 0, scaledMapWidth, scaledMapHeight)
          this.physics.world.setBounds(0, 0, scaledMapWidth, scaledMapHeight)

          // Add daytime brightness and vibrance effects to the camera
          if (this.cameras.main.postFX) {
            // Increase saturation for more vibrant colors
            this.cameras.main.postFX.addColorMatrix().saturate(0.4)
            // Add slight brightness boost for daytime feel
            this.cameras.main.postFX.addColorMatrix().brightness(1.15)
          }

          // Create player
          player = this.physics.add.sprite(450 * TERRAIN_SCALE, 550 * TERRAIN_SCALE, "survivor")
          player.setCollideWorldBounds(true)
          player.speed = 260 * TERRAIN_SCALE
          player.setDepth(2)
          player.setDisplaySize(32 * TERRAIN_SCALE, 35 * TERRAIN_SCALE)

          // Create gun and container
          playerContainer = this.add.container(player.x, player.y)
          gun = this.add.sprite(10 * TERRAIN_SCALE, 0, "gun") // Position gun to the right of center
          gun.setOrigin(0, 0.5)
          gun.setDisplaySize(32 * TERRAIN_SCALE, 14 * TERRAIN_SCALE)
          playerContainer.add(gun)
          playerContainer.setDepth(5) // Higher depth to be visible above player

          // Create animations
          this.createPlayerAnimations()
          this.createZombieAnimations()
          this.createOtherAnimations()

          // Create game groups
          bullets = this.physics.add.group({
            classType: window.Phaser.Physics.Arcade.Image,
            maxSize: 40,
            runChildUpdate: true,
          })
          zombies = this.physics.add.group()
          moneyGroup = this.physics.add.group()

          // Create shop (position and size scaled with terrain)
          shop = this.physics.add.sprite(620 * TERRAIN_SCALE, 470 * TERRAIN_SCALE, "shop").setDepth(2)
          shop.setScale(TERRAIN_SCALE)
          shop.anims.play("shop-anim")
          shop.setImmovable(true)

          // Set up collisions
          this.physics.add.collider(player, buildingsLayer)
          this.physics.add.collider(player, fenceLayer)
          this.physics.add.collider(player, carsLayer)
          this.physics.add.collider(zombies, buildingsLayer)
          this.physics.add.collider(zombies, fenceLayer)
          this.physics.add.collider(zombies, carsLayer)
          this.physics.add.collider(bullets, buildingsLayer, bulletHitsBuilding, null, this)
          this.physics.add.collider(bullets, fenceLayer, bulletHitsBuilding, null, this)
          this.physics.add.collider(bullets, carsLayer, bulletHitsBuilding, null, this)

          // Set up overlaps
          this.physics.add.overlap(bullets, zombies, bulletHitsZombie, null, this)
          this.physics.add.overlap(player, zombies, zombieHitsPlayer, null, this)
          this.physics.add.overlap(player, moneyGroup, collectMoney, null, this)
          this.physics.add.overlap(
            player,
            shop,
            () => {
              if (isDay) {
                isNearShop = true
                const shopkeeperSounds = ["shopkeeper1", "shopkeeper2", "shopkeeper3"]
                const randomSound = shopkeeperSounds[Math.floor(Math.random() * shopkeeperSounds.length)]
                if (!hasPlayedShopVoice) {
                  this.sound.play(randomSound, { volume: 0.5 })
                  hasPlayedShopVoice = true
                }
              }
            },
            null,
            this,
          )

          // Camera and controls
          this.cameras.main.startFollow(player)
          cursors = this.input.keyboard.createCursorKeys()
          keys = this.input.keyboard.addKeys("W,A,S,D,R")
          this.input.addPointer(3)

          // Set up joystick
          this.setupJoystick()

          // Set up shop menu
          this.setupShopMenu()

          // Set up shooting handler
          this.setupShooting()

          // Set up UI
          this.setupUI()

          // Set up fog of war
          this.setupFogOfWar(map, groundLayer, buildingsLayer, buildingsAbove)

          // Set up end screen
          this.setupEndScreen()

          // Set up event listeners
          this.setupEventListeners()

          updateShopBtns()
        }

        createPlayerAnimations() {
          this.anims.create({
            key: "up",
            frames: this.anims.generateFrameNumbers("survivor", { start: 0, end: 2 }),
            frameRate: 10,
            repeat: -1,
          })
          this.anims.create({
            key: "down",
            frames: this.anims.generateFrameNumbers("survivor", { start: 3, end: 5 }),
            frameRate: 10,
            repeat: -1,
          })
          this.anims.create({
            key: "right",
            frames: this.anims.generateFrameNumbers("survivor", { start: 6, end: 8 }),
            frameRate: 10,
            repeat: -1,
          })
          this.anims.create({
            key: "left",
            frames: this.anims.generateFrameNumbers("survivor", { start: 9, end: 11 }),
            frameRate: 10,
            repeat: -1,
          })
        }

        createZombieAnimations() {
          // Create all zombie animations for each type
          const zombieTypes = ["zombie", "zombiekid", "zombiegiant"]
          const directions = ["up", "down", "left", "right"]

          zombieTypes.forEach(type => {
            directions.forEach((direction, index) => {
              this.anims.create({
                key: `${type}-${direction}`,
                frames: this.anims.generateFrameNumbers(type, { start: index * 3, end: index * 3 + 2 }),
                frameRate: 10,
                repeat: -1,
              })
            })
          })
        }

        createOtherAnimations() {
          this.anims.create({
            key: "radio-anim",
            frames: this.anims.generateFrameNumbers("radio", { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1,
          })
          this.anims.create({
            key: "shop-anim",
            frames: this.anims.generateFrameNumbers("shop", { start: 0, end: 2 }),
            frameRate: 10,
            repeat: -1,
          })
          this.anims.create({
            key: "shop-anim-close",
            frames: this.anims.generateFrameNumbers("shopclose", { start: 0, end: 8 }),
            frameRate: 10,
            repeat: 0,
          })
          this.anims.create({
            key: "shop-anim-open",
            frames: this.anims.generateFrameNumbers("shopclose", { start: 0, end: 8 }),
            frameRate: 10,
            repeat: 0,
            inReverse: true,
          })
          this.anims.create({
            key: "money-spin",
            frames: this.anims.generateFrameNumbers("money", { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1,
          })
        }

        setupJoystick() {
          joystickBaseX = 70
          joystickBaseY = HEIGHT - 70
          maxJoystickDistance = 40

          const graphics = this.add.graphics()
          graphics.fillStyle(0x666666, 0.5)
          graphics.fillCircle(joystickBaseX, joystickBaseY, 40).setScrollFactor(0).setDepth(100)

          joystickHandle = this.add
            .sprite(joystickBaseX, joystickBaseY, "joystickHandleTexture")
            .setScrollFactor(0)
            .setTint(0x999999)
            .setDisplaySize(35, 35)
            .setDepth(100)

          const joystickZone = this.add
            .zone(joystickBaseX - 70, joystickBaseY - 70, 150, 150)
            .setOrigin(0, 0)
            .setInteractive()
            .setScrollFactor(0)

          joystickZone.on("pointerdown", (pointer: any) => {
            joystickActive = true
            joystickPointerId = pointer.id
            joystickHandle.setPosition(pointer.x, pointer.y)
          })

          this.input.on("pointermove", (pointer: any) => {
            if (joystickActive && pointer.id === joystickPointerId) {
              const dx = pointer.x - joystickBaseX
              const dy = pointer.y - joystickBaseY
              const distance = Math.min(Math.hypot(dx, dy), maxJoystickDistance)
              const angle = Math.atan2(dy, dx)

              joystickHandle.x = joystickBaseX + Math.cos(angle) * distance
              joystickHandle.y = joystickBaseY + Math.sin(angle) * distance

              player.setVelocity(Math.cos(angle) * distance * 4, Math.sin(angle) * distance * 4)
            }
          })

          this.input.on("pointerup", (pointer: any) => {
            if (pointer.id === joystickPointerId) {
              joystickActive = false
              joystickPointerId = null
              joystickHandle.setPosition(joystickBaseX, joystickBaseY)
              player.setVelocity(0, 0)
            }
          })
        }

        setupShopMenu() {
          shopMenu = this.add.container(0, 0).setScrollFactor(0).setDepth(20)

          const bg = this.add
            .image(WIDTH / 2, HEIGHT / 2, "shopbg")

            .setDisplaySize(240, 180)

          const title = this.add
            .text(WIDTH / 2, HEIGHT / 2 - 50, "Todays Menu", {
              fontFamily: '"Press Start 2P"',
              fontSize: "16px",
              fill: "#ffffff",
            })
            .setOrigin(0.5)

          stimmyBtn = this.add
            .image(132, HEIGHT / 2 + 10, "shopstimmy")
            .setDepth(100)
            .setDisplaySize(80, 80)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setInteractive()

          stimmyBtn.on("pointerdown", () => {
            if (cash >= 10 && health < 5) {
              cash -= 10
              cashText.setText("$" + cash)
              health++
              updateShopBtns()
              this.sound.play("cashregister", { volume: 0.5 })
            }
          })

          shotgunBtn = this.add
            .image(230, HEIGHT / 2 + 10, "shopshotgun")
            .setDepth(100)
            .setDisplaySize(80, 80)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setInteractive()

          shotgunBtn.on("pointerdown", () => {
            if (cash >= 50) {
              cash -= 50
              cashText.setText("$" + cash)
              currentGun = "shotgun"
              gun.setOrigin(0, 0.5)
              gun.setTexture("shotgun")
              gun.setDisplaySize(32 * TERRAIN_SCALE, 16 * TERRAIN_SCALE)
              updateShopBtns()
              this.sound.play("cashregister", { volume: 0.5 })
            }
          })

          const stimmyCost = this.add
            .text(110, HEIGHT / 2 - 17, "$10", {
              fontFamily: '"Press Start 2P"',
              fontSize: "10px",
              fill: "#00ff00",
              align: "center",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101)

          const stimmyText = this.add
            .text(130, HEIGHT / 2 + 60, "+1 HEALTH", {
              fontFamily: '"Press Start 2P"',
              fontSize: "8px",
              fill: "#ff0000",
              align: "center",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101)

          const shotgunCost = this.add
            .text(212, HEIGHT / 2 - 17, "$50", {
              fontFamily: '"Press Start 2P"',
              fontSize: "10px",
              fill: "#00ff00",
              align: "center",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101)

          const shotgunText = this.add
            .text(228, HEIGHT / 2 + 60, "SHOTGUN", {
              fontFamily: '"Press Start 2P"',
              fontSize: "8px",
              fill: "#ff0000",
              align: "center",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101)

          shopMenu.add([bg, title, stimmyCost, stimmyText, shotgunCost, shotgunText])
        }

        setupShooting() {
          this.input.on("pointerdown", (pointer: any, currentlyOver: any) => {
            if (pointer.id === joystickPointerId) return
            if (shopMenu.visible && stimmyBtn.visible && currentlyOver.length > 0) {
              return
            }
            // Don't shoot when puzzle is active
            if (isPuzzleActive) {
              return
            }
            if (!gameOver && !shopMenu.visible && !stimmyBtn.visible) {
              shoot(this, pointer.worldX, pointer.worldY)
            }
          })
        }

        setupUI() {
          navbarBg = this.add
            .image(WIDTH / 2, 50, "navbarbg")
            .setScrollFactor(0)

            .setDisplaySize(360, 112)

          madeByText = this.add
            .text(8, HEIGHT - 12, "Made by Divyansh_2824", {
              fontFamily: '"Press Start 2P"',
              fontSize: "6px",
              fill: "#ffffff",
            })
            .setScrollFactor(0)


          heartImage = this.add
            .image(14, 46, "heart")
            .setScrollFactor(0)
            .setDepth(100)
            .setDisplaySize(20, 15)

          scoreText = this.add
            .text(6, 60, "Score:" + score, uiTextStyle)
            .setScrollFactor(0)


          cashText = this.add
            .text(6, 78, "$" + cash, uiTextStyle)
            .setScrollFactor(0)


          healthBar = this.add.graphics()
          healthBar.setScrollFactor(0)
          healthBar

          dayNightImage = this.add
            .image(WIDTH - 80, 66, "moon")
            .setScrollFactor(0)

            .setDisplaySize(20, 20)

          timerText = this.add
            .text(WIDTH - 34, 66, "", uiTextStyle)
            .setScrollFactor(0)

            .setOrigin(0.5)

          waveText = this.add
            .text(WIDTH - 40, 46, `${isDay ? "Day" : "Wave"}: ${waveNumber}`, uiTextStyle)
            .setScrollFactor(0)

            .setOrigin(0.5)

          // Mutation meter UI (virus icon + bar directly above health bar)
          mutationIcon = this.add
            .text(14, 30, "🧬", {
              fontSize: "12px",
            })
            .setScrollFactor(0)
            .setDepth(100)
            .setOrigin(0, 0.5)

          mutationBar = this.add.graphics()
          mutationBar.setScrollFactor(0)
          mutationBar

          // Solve puzzle button (hidden initially, shown when mutation meter fills)
          // Original dimensions: 951 × 262, scale to similar size as play button (180x50)
          solvePuzzleBtn = this.add
            .image(WIDTH / 2, HEIGHT / 2, "solvepuzzle")
            .setOrigin(0.5)
            .setInteractive()
            .setDisplaySize(180, 50)
            .setScrollFactor(0)
            .setDepth(5500)
            .setVisible(false)

          solvePuzzleBtn.on("pointerdown", () => {
            solvePuzzleBtn.setVisible(false)
            showSolvePuzzleBtn = false
            showDNAPuzzle(this)
          })
        }

        setupFogOfWar(map: any, groundLayer: any, buildingsLayer: any, buildingsAbove: any) {
          rt = this.make.renderTexture({
            x: 0,
            y: 0,
            width: map.widthInPixels * TERRAIN_SCALE,
            height: map.heightInPixels * TERRAIN_SCALE,
            add: true,
          })

          rt.fill(0x000000, 1)
          rt.draw(groundLayer)
          // Brighter daytime tint (lighter blue-grey instead of dark blue)
          rt.setTint(0x4a6a88)

          const vision = this.make.image({
            x: player.x,
            y: player.y,
            key: "vision",
            add: false,
          })

          this.vision = vision
          this.vision.setScale(2 * TERRAIN_SCALE).setDepth(5)
          this.fogMask = new window.Phaser.Display.Masks.BitmapMask(this, vision)
          this.fogMask.invertAlpha = true
          rt.mask = this.fogMask

          this.zombieMask = new window.Phaser.Display.Masks.BitmapMask(this, vision)
          this.zombieMask.invertAlpha = false
          buildingsLayer.mask = this.zombieMask
          buildingsAbove.mask = this.zombieMask
          shop.mask = this.zombieMask
        }

        setupEndScreen() {
          endbgblack = this.add
            .rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.9)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(4999)
            .setVisible(false)

          endbg = this.add
            .image(WIDTH / 2, HEIGHT / 2, "shopbg")
            .setOrigin(0.5)
            .setDepth(5000)
            .setScrollFactor(0)
            .setDisplaySize(240, 340)
            .setVisible(false)

          endStatsHeading = this.add
            .text(WIDTH / 2, HEIGHT / 2 - 100, "KILLZ\nREPORT", {
              fontFamily: '"Press Start 2P"',
              fontSize: "14px",
              fill: "#ffffff",
              align: "center",
              lineSpacing: 6,
            })
            .setOrigin(0.5)
            .setDepth(5001)
            .setScrollFactor(0)
            .setVisible(false)

          endStatsText = this.add
            .text(
              WIDTH / 2 - 5,
              HEIGHT / 2 - 15,
              `Score: ${score}\nSurvived:${waveNumber} days\nKills:${kills}\nCash: ${cash}\nWeapon: ${currentGun}`,
              {
                fontFamily: '"Press Start 2P"',
                fontSize: "10px",
                fill: "#ffffff",
                align: "left",
                lineSpacing: 9,
              },
            )
            .setOrigin(0.5)
            .setDepth(5002)
            .setScrollFactor(0)
            .setVisible(false)

          claimBtn = this.add
            .image(WIDTH / 2, HEIGHT / 2 + 70, "claimbutton")
            .setOrigin(0.5)
            .setInteractive()
            .setDisplaySize(140, 39)
            .setDepth(5001)
            .setScrollFactor(0)
            .setVisible(false)

          claimBtn.setVisible(false)

          // Claim transaction loading text (hidden initially)
          const claimTxLoadingText = this.add
            .text(WIDTH / 2, HEIGHT / 2 + 120, "Confirming\ntransaction...", {
              fontFamily: '"Press Start 2P"',
              fontSize: "12px",
              fill: "#ffff00",
              align: "center",
              lineSpacing: 8,
              stroke: "#000000",
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(5002)
            .setScrollFactor(0)
            .setVisible(false)
          claimTxLoadingText.setShadow(2, 2, "#000000", 2, true, true)

          // Claim transaction error text (hidden initially)
          const claimTxErrorText = this.add
            .text(WIDTH / 2, HEIGHT / 2 + 120, "", {
              fontFamily: '"Press Start 2P"',
              fontSize: "12px",
              fill: "#ff4444",
              align: "center",
              lineSpacing: 8,
              stroke: "#000000",
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(5002)
            .setScrollFactor(0)
            .setVisible(false)
          claimTxErrorText.setShadow(2, 2, "#000000", 2, true, true)

          // Create chest sprite for claim animation
          chestSprite = this.add
            .sprite(WIDTH / 2, HEIGHT / 2, "chest")
            .setOrigin(0.5)
            .setDisplaySize(180, 180)
            .setDepth(5003)
            .setScrollFactor(0)
            .setVisible(false)

          // Create chest opening animation (1 second duration)
          this.anims.create({
            key: "chest_open",
            frames: this.anims.generateFrameNumbers("chest", { start: 0, end: 3 }),
            frameRate: 4, // 4 frames at 4 fps = 1 second
            repeat: 0,
          })

          endContinueBtn = this.add
            .image(WIDTH / 2, HEIGHT / 2 + 120, "exitbutton")
            .setOrigin(0.5)
            .setInteractive()
            .setDisplaySize(140, 39)
            .setDepth(5001)
            .setScrollFactor(0)
            .setVisible(false)

          // Create coin image (hidden initially, will show claimed coin)
          // Position it above the chest like it popped out
          coinImage = this.add
            .image(WIDTH / 2, HEIGHT / 2 - 100, "coin_pratzyy")
            .setOrigin(0.5)
            .setDisplaySize(80, 80)
            .setDepth(5010)
            .setScrollFactor(0)
            .setVisible(false)

          // Set up claim button handler - randomly shows one of 3 coins
          claimBtn.on("pointerdown", async () => {
            if (hasClaimed) return // Prevent double claiming

            // Show loading state
            claimBtn.setVisible(false)
            endContinueBtn.setVisible(false)
            claimTxLoadingText.setVisible(true)
            claimTxErrorText.setVisible(false)

            try {
              let txSuccess = false

              // Use Farcaster Mini App SDK's ethereum provider (native Farcaster wallet)
              const provider = await sdk.wallet.getEthereumProvider()

              if (provider) {
                // Request accounts first
                const accounts = await provider.request({ method: 'eth_requestAccounts' })
                if (accounts && accounts.length > 0) {
                  const userAddress = accounts[0]
                  // Send 0-value transaction on Base chain
                  const txHash = await provider.request({
                    method: 'eth_sendTransaction',
                    params: [{
                      from: userAddress,
                      to: userAddress, // Send to self (0 value)
                      value: "0x0", // 0 ETH
                      data: "0x", // Empty data
                      chainId: "0x2105", // Base chain
                    }],
                  })

                  if (txHash) {
                    console.log("Claim transaction confirmed:", txHash)
                    txSuccess = true
                  }
                }
              } else {
                // No wallet available
                claimTxErrorText.setText("No wallet found!")
                claimTxErrorText.setVisible(true)
                claimTxLoadingText.setVisible(false)
                claimBtn.setVisible(true)
                endContinueBtn.setVisible(true)
                return
              }

              // Only show chest if transaction was successful
              if (txSuccess) {
                claimTxLoadingText.setText("Saving score...")

                // Save score to Firestore
                try {
                  const accounts = await provider.request({ method: 'eth_requestAccounts' })
                  const userAddress = accounts[0]

                  // Get Farcaster user context for username, fid, and pfp
                  const context = await sdk.context
                  const username = context?.user?.username || context?.user?.displayName || userAddress.slice(0, 10)
                  const fid = context?.user?.fid || 0
                  const pfp = context?.user?.pfpUrl || ""

                  // Save score to Firestore (cumulative)
                  await savePlayerScore(userAddress, score, username, fid, pfp)
                  console.log(`Score saved to Firestore: ${score} for ${username}`)

                  claimTxLoadingText.setText("Opening chest...")
                } catch (saveError) {
                  console.error("Error saving score to Firestore:", saveError)
                  // Continue with chest animation even if save fails
                  claimTxLoadingText.setText("Opening chest...")
                }

                // Small delay then show chest animation
                const scene = this
                setTimeout(() => {
                  claimTxLoadingText.setVisible(false)

                  isClaimScreenActive = true
                  // Hide board and all end screen elements by setting alpha to 0 and disabling
                  endbg.setAlpha(0)
                  endStatsHeading.setAlpha(0)
                  endStatsText.setAlpha(0)
                  claimBtn.setAlpha(0)
                  claimBtn.disableInteractive()
                  endContinueBtn.setAlpha(0)
                  endContinueBtn.disableInteractive()

                  // Show chest and play animation
                  chestSprite.setVisible(true)
                  chestSprite.setAlpha(1)
                  chestSprite.play("chest_open")

                  // Play chest opening sound
                  scene.sound.play("chestopeningcoc", { volume: 0.5 })

                  // Custom coins with their image keys and symbols
                  const coins = [
                    { imageKey: "coin_pratzyy", symbol: "$pratzyy" },
                    { imageKey: "coin_bhadoriya", symbol: "$bhadoriya" },
                    { imageKey: "coin_jesse", symbol: "$jesse" }
                  ]

                  // Pick random coin and amount
                  const randomCoin = coins[Math.floor(Math.random() * coins.length)]
                  const randomAmount = Math.floor(Math.random() * 91) + 10 // 10-100 range

                  // After animation, show result
                  chestSprite.once("animationcomplete", () => {
                    // Set the coin image texture and show it
                    coinImage.setTexture(randomCoin.imageKey)
                    coinImage.setDisplaySize(80, 80)
                    coinImage.setVisible(true)

                    // Show claim result with amount and symbol (with gap from chest)
                    claimResultText.setText(`You got:\n${randomAmount} ${randomCoin.symbol}`)
                    claimResultText.setVisible(true)
                    claimResultText.setAlpha(1)

                    // Mark as claimed and change button
                    hasClaimed = true
                    claimBtn.setTexture("claimedbutton")

                    // Show exit button
                    claimExitBtn.setVisible(true)
                    claimExitBtn.setAlpha(1)
                    claimExitBtn.setInteractive()
                  })
                }, 1500)
              } else {
                claimTxErrorText.setText("Transaction failed")
                claimTxErrorText.setVisible(true)
                claimTxLoadingText.setVisible(false)
                claimBtn.setVisible(true)
                endContinueBtn.setVisible(true)
              }
            } catch (error: any) {
              console.log("Claim transaction failed or cancelled:", error)
              // Show error and restore claim button
              const errorMsg = error.code === 4001 ? "Transaction\ncancelled" : "Transaction\nfailed"
              claimTxErrorText.setText(errorMsg)
              claimTxErrorText.setVisible(true)
              claimTxLoadingText.setVisible(false)
              claimBtn.setVisible(true)
              endContinueBtn.setVisible(true)
            }
          })

          // Create claim result text (hidden initially) - positioned below coin image
          claimResultText = this.add
            .text(WIDTH / 2, HEIGHT / 2 + 155, "", {
              fontFamily: '"Press Start 2P"',
              fontSize: "14px",
              fill: "#ffffff",
              align: "center",
              lineSpacing: 12,
            })
            .setOrigin(0.5)
            .setDepth(5004)
            .setScrollFactor(0)
            .setVisible(false)

          // Create exit button for claim screen - positioned below result text
          claimExitBtn = this.add
            .image(WIDTH / 2, HEIGHT / 2 + 240, "exitbutton")
            .setOrigin(0.5)
            .setInteractive()
            .setDisplaySize(140, 39)
            .setDepth(5004)
            .setScrollFactor(0)
            .setVisible(false)

          claimExitBtn.on("pointerdown", () => {
            // Hide claim screen and reset alpha values
            chestSprite.setVisible(false)
            chestSprite.setAlpha(1)
            claimResultText.setVisible(false)
            claimExitBtn.setVisible(false)
            coinImage.setVisible(false)
            endbgblack.setVisible(false)
            // Reset alpha for end screen elements
            endbg.setAlpha(1)
            endStatsHeading.setAlpha(1)
            endStatsText.setAlpha(1)
            // Reset claim button to original texture for next game
            claimBtn.setTexture("claimbutton")
            claimBtn.setAlpha(1)
            claimBtn.setInteractive()
            endContinueBtn.setAlpha(1)
            endContinueBtn.setInteractive()
            isClaimScreenActive = false
            hasClaimed = false // Reset for next game
            finishGame(this)
            // Reset game state and go back to title screen
            restart(this)
            this.scene.start("LoadingScene")
          })

          endContinueBtn.on("pointerdown", () => {
            endStatsText.setVisible(false)
            endStatsHeading.setVisible(false)
            endContinueBtn.setVisible(false)
            claimBtn.setVisible(false)
            chestSprite.setVisible(false)
            coinImage.setVisible(false)
            endbgblack.setVisible(false)
            endbg.setVisible(false)
            // Reset alpha values
            endbg.setAlpha(1)
            endStatsHeading.setAlpha(1)
            endStatsText.setAlpha(1)
            // Reset claim button for next game
            claimBtn.setTexture("claimbutton")
            claimBtn.setAlpha(1)
            claimBtn.setInteractive()
            endContinueBtn.setAlpha(1)
            hasClaimed = false // Reset for next game
            finishGame(this)
            // Reset game state and go back to title screen
            restart(this)
            this.scene.start("LoadingScene")
          })
        }

        setupEventListeners() {
          if (window.FarcadeSDK) {
            window.FarcadeSDK.on("play_again", () => {
              restart(this)
              updateShopBtns()
            })
            window.FarcadeSDK.on("toggle_mute", (data: any) => {
              this.sound.mute = data.isMuted
            })
          }
        }

        update(time: number, delta: number) {
          if (gameOver) {
            if (keys.R.isDown) restart(this)
            return
          }

          // Time management
          let hours = Math.floor(gameTimeMinutes / 60)
          let minutes = Math.floor(gameTimeMinutes % 60)
          isDay = hours >= 9 && hours < 15

          let realSecondsPerGameMinute
          if (isDay) {
            realSecondsPerGameMinute = 15 / (6 * 60)
          } else {
            realSecondsPerGameMinute = 45 / (18 * 60)
          }

          let minutesToAdd = delta / 1000 / realSecondsPerGameMinute
          gameTimeMinutes = (gameTimeMinutes + minutesToAdd) % 1440

          // Day/night transition
          if (isDay !== lastIsDay) {
            lastIsDay = isDay
            this.tweens.add({
              targets: this.vision,
              scaleX: isDay ? 2 : 1,
              scaleY: isDay ? 2 : 1,
              duration: 2000,
              ease: "Linear",
            })

            if (isDay) {
              zombies.children.iterate((zombie: any) => {
                if (zombie && zombie.active) {
                  const p = this.add.particles("blood")
                  const emitter = p.createEmitter({
                    x: zombie.x,
                    y: zombie.y,
                    speed: { min: 80, max: 200 },
                    angle: { min: 0, max: 360 },
                    gravityY: 0,
                    lifespan: 400,
                    quantity: 12,
                    scale: { start: 0.9, end: 0 },
                    on: false,
                  })
                  emitter.explode(12, zombie.x, zombie.y)
                }
              })

              waveNumber++
              waveText.setText(`${isDay ? "Day" : "Wave"}: ${waveNumber}`)

              shop.setVisible(true)
              this.tweens.add({
                targets: shop,
                x: shop.x + 100,
                duration: 400,
                ease: "Power2",
                onComplete: () => {
                  shop.anims.play("shop-anim-open")
                },
              })

              this.time.delayedCall(2000, () => {
                shop.anims.play("shop-anim")
              })

              shopMenu.setVisible(true)
              stimmyBtn.setVisible(true)
              shotgunBtn.setVisible(true)
              zombies.clear(true, true)
            } else {
              shop.anims.play("shop-anim-close")
              this.time.delayedCall(2000, () => {
                this.tweens.add({
                  targets: shop,
                  x: shop.x - 100,
                  duration: 400,
                  ease: "Power2",
                  onComplete: () => {
                    shop.setVisible(false)
                  },
                })
              })

              shopMenu.setVisible(false)
              stimmyBtn.setVisible(false)
              shotgunBtn.setVisible(false)
              waveText.setText(`${isDay ? "Day" : "Wave"}: ${waveNumber}`)
              this.sound.play("music", { volume: 0.4 })
            }
          }

          waveActive = !isDay
          dayNightImage.setTexture(isDay ? "sun" : "moon")

          let clockText = hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0")
          timerText.setText(clockText)

          rt.visible = true

          // Player movement
          if (!joystickActive) {
            let vx = 0, vy = 0
            if (cursors.left.isDown || keys.A.isDown) vx -= player.speed
            else if (cursors.right.isDown || keys.D.isDown) vx += player.speed
            else if (cursors.up.isDown || keys.W.isDown) vy -= player.speed
            else if (cursors.down.isDown || keys.S.isDown) vy += player.speed

            if (vx !== 0 || vy !== 0) {
              footstepsTimer += delta
              if (footstepsTimer >= 100) {
                this.sound.play("running", { volume: 0.05 })
                footstepsTimer = 0
              }
            }

            player.setVelocity(vx, vy)
          }

          // Update container
          if (playerContainer) {
            playerContainer.setPosition(player.x, player.y)
          }

          // Player animations
          const velocity = player.body.velocity
          if (velocity.x > 0) {
            player.anims.play("right", true)
            playerContainer.setDepth(5)
          } else if (velocity.x < 0) {
            player.anims.play("left", true)
            playerContainer.setDepth(5)
          } else if (velocity.y < 0) {
            player.anims.play("up", true)
            playerContainer.setDepth(1)
          } else if (velocity.y > 0) {
            player.anims.play("down", true)
            playerContainer.setDepth(5)
          } else {
            player.anims.stop()
          }

          // Update container position to player center
          playerContainer.x = player.x
          playerContainer.y = player.y

          // Gun rotation
          if (gun) {
            const pointer = this.input.activePointer
            const angle = window.Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY)
            if (pointer.worldX < playerContainer.x) {
              gun.setFlipY(true)
              gun.setFlipX(false)
              gun.setRotation(angle)
            } else {
              gun.setFlipX(false)
              gun.setFlipY(false)
              gun.setRotation(angle)
            }
          }

          // Zombie spawning
          const currentDelay = Math.max(1500, 3000 - (waveNumber - 1) * 500)
          if (waveActive) {
            spawnTimer += delta
            if (spawnTimer > currentDelay) {
              spawnTimer = 0
              spawnZombie(this)
            }
          }

          // Zombie AI - pause during puzzle
          zombies.getChildren().forEach((z: any) => {
            if (!z.active) return

            // If puzzle is active, stop zombies
            if (isPuzzleActive) {
              z.body.velocity.x = 0
              z.body.velocity.y = 0
              return
            }

            const speed = z.baseSpeed
            this.physics.moveToObject(z, player, speed)
            const angleToPlayer = window.Phaser.Math.Angle.Between(z.x, z.y, player.x, player.y)
            const direction = window.Phaser.Math.RadToDeg(angleToPlayer)

            // Map zombieTypeSpawned to the correct animation prefix
            let animPrefix = "zombie"
            if (z.zombieTypeSpawned === "kid") animPrefix = "zombiekid"
            else if (z.zombieTypeSpawned === "giant") animPrefix = "zombiegiant"

            if (direction > -45 && direction <= 45) z.anims.play(`${animPrefix}-right`, true)
            else if (direction > 45 && direction <= 135) z.anims.play(`${animPrefix}-down`, true)
            else if (direction > 135 || direction <= -135) z.anims.play(`${animPrefix}-left`, true)
            else z.anims.play(`${animPrefix}-up`, true)
          })

          // Invulnerability timer
          if (!canBeHit) {
            if (player._invulnTimer === undefined) player._invulnTimer = 0
            player._invulnTimer -= delta
            if (player._invulnTimer <= 0) {
              canBeHit = true
              player.clearTint()
            }
          }

          // Shop overlap check
          if (!this.physics.overlap(player, shop)) {
            isNearShop = false
            hasPlayedShopVoice = false
          }

          if (isDay) {
            shopMenu.setVisible(isNearShop)
            stimmyBtn.setVisible(isNearShop)
            shotgunBtn.setVisible(isNearShop)
          }

          // Update UI
          scoreText.setText("Score:" + score)
          cashText.setText("$ " + cash)
          healthBar.clear()
          healthBar.fillStyle(0xff0000, 1)
          healthBar.fillRect(16, 42, (health / 5) * 100, 10)

          // Update mutation meter
          mutationBar.clear()
          // Background (empty bar) - directly above health bar
          mutationBar.fillStyle(0x333333, 1)
          mutationBar.fillRect(26, 30, 80, 8)
          // Filled portion (green/toxic color)
          mutationBar.fillStyle(0x44ff44, 1)
          mutationBar.fillRect(26, 30, (mutationMeter / MUTATION_KILLS_NEEDED) * 80, 8)
          // Border
          mutationBar.lineStyle(1, 0xffffff, 0.5)
          mutationBar.strokeRect(26, 30, 80, 8)

          // Game over check
          if (health <= 0 && !gameOver) {
            zombies.clear(true, true)
            canBeHit = false
            endStatsHeading.setVisible(true)
            endStatsText.setText(
              `Score: ${score}\nSurvived:${waveNumber - 1} days\nKills:${kills}\nCash: ${cash}\nWeapon: ${currentGun}`,
            )
            endStatsText.setVisible(true)
            endContinueBtn.setVisible(true)
            claimBtn.setVisible(true)
            endbgblack.setVisible(true)
            endbg.setVisible(true)
            if (window.FarcadeSDK) {
              window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
            }
            if (!hasPlayedDeathscream) {
              this.sound.play("playerdeath", { volume: 0.2 })
              hasPlayedDeathscream = true
            }
          }

          // Update vision
          if (this.vision) {
            this.vision.x = player.x
            this.vision.y = player.y
          }
        }
      }

      // Game configuration
      const config = {
        type: window.Phaser.AUTO,
        parent: gameContainerRef.current,
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: "#2b2b2b",
        physics: {
          default: "arcade",
          arcade: {
            debug: false,
            gravity: { y: 0 },
          },
        },
        scale: {
          mode: window.Phaser.Scale.FIT,
          autoCenter: window.Phaser.Scale.CENTER_BOTH,
        },
        pixelArt: true,
        scene: [BootScene, LoadingScene, GameScene],
      }

      // Start Phaser
      gameInstanceRef.current = new window.Phaser.Game(config)
    }

    loadScripts()

    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true)
        gameInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="h-screen w-full flex items-center justify-center bg-black">
      <div ref={gameContainerRef} className="block mx-auto" />
    </div>
  )
}
