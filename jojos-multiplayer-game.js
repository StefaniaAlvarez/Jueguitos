// ==========================================
// JUEGO DE DISPAROS MULTIJUGADOR - JOJO'S
// ==========================================

class Player {
  constructor(id, name, x, y) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 40;
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = 5;
    this.health = 100;
    this.maxHealth = 100;
    this.stand = null;
    this.stance = 'idle'; // idle, attacking, dash
    this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
    this.angle = 0;
  }

  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Limites del mapa
    this.x = Math.max(0, Math.min(this.x, 800 - this.width));
    this.y = Math.max(0, Math.min(this.y, 600 - this.height));
  }

  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
  }

  move(direction) {
    switch(direction) {
      case 'up':
        this.velocityY = -this.speed;
        break;
      case 'down':
        this.velocityY = this.speed;
        break;
      case 'left':
        this.velocityX = -this.speed;
        break;
      case 'right':
        this.velocityX = this.speed;
        break;
    }
  }

  stopMove() {
    this.velocityX = 0;
    this.velocityY = 0;
  }

  dash() {
    if (this.stance === 'idle') {
      this.stance = 'dash';
      this.speed = 12;
      setTimeout(() => {
        this.speed = 5;
        this.stance = 'idle';
      }, 200);
    }
  }

  attack() {
    this.stance = 'attacking';
    setTimeout(() => {
      this.stance = 'idle';
    }, 300);
  }

  draw(ctx) {
    // Cuerpo del jugador
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Barra de salud
    const barWidth = this.width;
    const barHeight = 5;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(this.x, this.y - 10, barWidth, barHeight);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(this.x, this.y - 10, (this.health / this.maxHealth) * barWidth, barHeight);

    // Nombre del jugador
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x + this.width / 2, this.y - 20);

    // Indicador de stance
    if (this.stance === 'attacking') {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.strokeRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);
    }
  }
}

class Stand {
  constructor(player) {
    this.player = player;
    this.name = ['The World', 'Gold Experience', 'Star Platinum', 'Crazy Diamond'][Math.floor(Math.random() * 4)];
    this.radius = 40;
    this.angle = 0;
    this.damage = 15;
  }

  update() {
    this.angle += 0.05;
  }

  getPosition() {
    const offsetX = Math.cos(this.angle) * this.radius;
    const offsetY = Math.sin(this.angle) * this.radius;
    return {
      x: this.player.x + this.player.width / 2 + offsetX,
      y: this.player.y + this.player.height / 2 + offsetY
    };
  }

  draw(ctx) {
    const pos = this.getPosition();
    ctx.fillStyle = 'rgba(200, 100, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

class Projectile {
  constructor(x, y, targetX, targetY, playerId, damage = 10) {
    this.x = x;
    this.y = y;
    this.playerId = playerId;
    this.damage = damage;
    this.speed = 8;
    this.radius = 5;
    
    // Calcular dirección
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    this.velocityX = (dx / distance) * this.speed;
    this.velocityY = (dy / distance) * this.speed;
    this.lifetime = 300;
  }

  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;
    this.lifetime--;
  }

  draw(ctx) {
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  isAlive() {
    return this.lifetime > 0 && 
           this.x > 0 && this.x < 800 && 
           this.y > 0 && this.y < 600;
  }
}

class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.players = new Map();
    this.projectiles = [];
    this.gameRunning = true;
    this.keys = {};
    this.mousePos = { x: 0, y: 0 };

    this.setupEventListeners();
    this.gameLoop();
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener('click', () => {
      this.playerShoot();
    });

    window.addEventListener('keypress', (e) => {
      if (e.key === ' ') {
        const player = this.players.get('player1');
        if (player) player.dash();
      }
    });
  }

  addPlayer(id, name, x, y) {
    const player = new Player(id, name, x, y);
    player.stand = new Stand(player);
    this.players.set(id, player);
  }

  playerShoot() {
    const player = this.players.get('player1');
    if (player) {
      const projectile = new Projectile(
        player.x + player.width / 2,
        player.y + player.height / 2,
        this.mousePos.x,
        this.mousePos.y,
        'player1',
        15
      );
      this.projectiles.push(projectile);
      player.attack();
    }
  }

  update() {
    // Actualizar entrada del jugador
    const player = this.players.get('player1');
    if (player) {
      if (this.keys['w']) player.move('up');
      if (this.keys['s']) player.move('down');
      if (this.keys['a']) player.move('left');
      if (this.keys['d']) player.move('right');
      
      // Si no hay tecla presionada, detener movimiento
      if (!this.keys['w'] && !this.keys['s'] && 
          !this.keys['a'] && !this.keys['d']) {
        player.stopMove();
      }

      player.update();
      if (player.stand) player.stand.update();
    }

    // Actualizar otros jugadores (IA simple)
    this.players.forEach((player, id) => {
      if (id !== 'player1') {
        this.updateAIPlayer(player);
      }
    });

    // Actualizar proyectiles
    this.projectiles = this.projectiles.filter(proj => proj.isAlive());
    this.projectiles.forEach(proj => {
      proj.update();

      // Detectar colisiones con jugadores
      this.players.forEach((player, id) => {
        if (proj.playerId !== id) {
          const distance = Math.hypot(
            proj.x - (player.x + player.width / 2),
            proj.y - (player.y + player.height / 2)
          );

          if (distance < proj.radius + 15) {
            player.takeDamage(proj.damage);
            proj.lifetime = 0;
          }
        }
      });
    });

    // Revisar jugadores derrotados
    this.players.forEach((player, id) => {
      if (player.health <= 0 && id !== 'player1') {
        this.players.delete(id);
      }
    });
  }

  updateAIPlayer(player) {
    const mainPlayer = this.players.get('player1');
    if (!mainPlayer) return;

    // IA simple: seguir y disparar al jugador principal
    const dx = mainPlayer.x - player.x;
    const dy = mainPlayer.y - player.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 0) {
      const moveSpeed = 0.8;
      player.velocityX = (dx / distance) * moveSpeed;
      player.velocityY = (dy / distance) * moveSpeed;
    }

    player.update();
    if (player.stand) player.stand.update();

    // Disparar ocasionalmente
    if (Math.random() < 0.02) {
      const projectile = new Projectile(
        player.x + player.width / 2,
        player.y + player.height / 2,
        mainPlayer.x,
        mainPlayer.y,
        player.id,
        12
      );
      this.projectiles.push(projectile);
    }
  }

  draw() {
    // Limpiar canvas
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Cuadrícula de fondo
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.canvas.width; i += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
    }
    for (let i = 0; i < this.canvas.height; i += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.canvas.width, i);
      this.ctx.stroke();
    }

    // Dibujar jugadores
    this.players.forEach(player => {
      player.draw(this.ctx);
      if (player.stand) player.stand.draw(this.ctx);
    });

    // Dibujar proyectiles
    this.projectiles.forEach(proj => proj.draw(this.ctx));

    // Información del juego
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillText(`Jugadores: ${this.players.size}`, 10, 25);
    this.ctx.fillText(`Proyectiles: ${this.projectiles.length}`, 10, 45);

    const mainPlayer = this.players.get('player1');
    if (mainPlayer) {
      this.ctx.fillText(`Salud: ${mainPlayer.health}/${mainPlayer.maxHealth}`, 10, 65);
      this.ctx.fillText(`Stand: ${mainPlayer.stand.name}`, 10, 85);
    }

    // Controles en pantalla
    this.ctx.font = '12px Arial';
    this.ctx.fillText('WASD: Mover | Click: Disparar | ESPACIO: Dash', 10, this.canvas.height - 10);
  }

  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// Inicializar juego
window.addEventListener('load', () => {
  const game = new Game('gameCanvas');
  
  // Agregar jugador principal
  game.addPlayer('player1', 'Tú', 50, 300);
  
  // Agregar enemigos IA
  game.addPlayer('enemy1', 'Enemy 1', 700, 150);
  game.addPlayer('enemy2', 'Enemy 2', 700, 450);
});
