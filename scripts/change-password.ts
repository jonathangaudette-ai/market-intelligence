import postgres from 'postgres';
import { hash } from 'bcryptjs';
import * as readline from 'readline';

const sql = postgres(process.env.DATABASE_URL!);

/**
 * Create readline interface for secure password input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt for input (with optional hidden input for passwords)
 */
function prompt(question: string, hideInput: boolean = false): Promise<string> {
  const rl = createReadlineInterface();

  return new Promise((resolve) => {
    if (hideInput) {
      // Hide input for password
      const stdin = process.stdin;
      (stdin as any).setRawMode(true);
      stdin.resume();

      let password = '';
      process.stdout.write(question);

      stdin.on('data', (char) => {
        const key = char.toString();

        if (key === '\n' || key === '\r' || key === '\u0004') {
          // Enter or Ctrl-D
          (stdin as any).setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          rl.close();
          resolve(password);
        } else if (key === '\u0003') {
          // Ctrl-C
          process.exit();
        } else if (key === '\u007f') {
          // Backspace
          password = password.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(question + '*'.repeat(password.length));
        } else {
          password += key;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Validate password strength
 */
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Le mot de passe doit contenir au moins 12 caractères');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Change user password
 */
async function changePassword() {
  try {
    console.log('🔐 Changement de mot de passe\n');

    // Get email from command line or prompt
    let email = process.argv[2];

    if (!email) {
      email = await prompt('Email de l\'utilisateur: ');
    }

    // Check if user exists
    const [user] = await sql`
      SELECT id, name, email FROM users WHERE email = ${email}
    `;

    if (!user) {
      console.error(`\n❌ Utilisateur avec l'email "${email}" introuvable`);
      process.exit(1);
    }

    console.log(`\n✅ Utilisateur trouvé: ${user.name || user.email}\n`);

    // Prompt for new password
    const newPassword = await prompt('Nouveau mot de passe: ', true);
    const confirmPassword = await prompt('Confirmer le mot de passe: ', true);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      console.error('\n❌ Les mots de passe ne correspondent pas');
      process.exit(1);
    }

    // Validate password strength
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      console.error('\n❌ Mot de passe non conforme aux exigences:');
      validation.errors.forEach((error) => console.error(`   • ${error}`));
      process.exit(1);
    }

    // Hash the password
    console.log('\n⏳ Hachage du mot de passe...');
    const passwordHash = await hash(newPassword, 10);

    // Update the password
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    console.log(`\n✅ Mot de passe changé avec succès pour ${user.email}`);
    console.log('\n🔒 Recommandations de sécurité:');
    console.log('   • Ne partagez jamais votre mot de passe');
    console.log('   • Utilisez un gestionnaire de mots de passe');
    console.log('   • Changez votre mot de passe régulièrement (tous les 90 jours)');
    console.log('   • Ne réutilisez pas le même mot de passe sur plusieurs services\n');

    await sql.end();
  } catch (error) {
    console.error('\n❌ Erreur lors du changement de mot de passe:', error);
    await sql.end();
    process.exit(1);
  }
}

changePassword();
