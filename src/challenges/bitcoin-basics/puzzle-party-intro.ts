import { Challenge } from '@/types/challenge'

export const programmingPuzzlePartyIntro: Challenge = {
  metadata: {
    id: 'puzzle-party-intro',
    title: 'Programming Puzzle Party - Introducción',
    description: 'Bienvenida al Programming Puzzle Party: Tu aventura con Bitcoin y Lightning Network comienza aquí',
    difficulty: 'beginner',
    category: 'bitcoin-basics',
    estimatedTime: 15,
    points: 100,
    chapterNumber: 1,
    order: 1,
    github: {
      templateRepository: 'kleysc/programming-puzzle-party',
      assignmentSlug: 'wkJqDNHy'
    }
  },
  story: {
    chapterTitle: 'Bienvenida al Programming Puzzle Party',
    introduction: `¡Bienvenido al Programming Puzzle Party! 🎉

Estás a punto de embarcarte en una aventura emocionante llena de desafíos de programación con temática de Bitcoin y Lightning Network. Este no es un programa ordinario - es una fiesta donde cada rompecabezas resuelto te acerca más a dominar el ecosistema Bitcoin.`,
    context: `El Programming Puzzle Party está diseñado para llevarte desde los fundamentos hasta conceptos avanzados a través de desafíos interactivos y divertidos.

En esta fiesta encontrarás tres grandes rompecabezas esperándote:

• **Sudoku de Satoshi** - Donde números y hashes se entrelazan misteriosamente

• **Mochila del Minero** - La optimización blockchain te espera  

• **Enrutamiento Lightning** - Navega por redes de canales de pago

Tu mentor, Dr. Hash, ha organizado esta fiesta especialmente para desarrolladores como tú que buscan conquistar Bitcoin.`,
    objective: `Tu misión en esta introducción es familiarizarte con el repositorio Programming Puzzle Party y elegir tu primer desafío.

Pasos a seguir:
1. Acepta la asignación de GitHub Classroom
2. Explora el repositorio y lee las instrucciones
3. Elige uno de los tres desafíos disponibles
4. ¡Comienza tu aventura en el Programming Puzzle Party!`,
    conclusion: `¡Perfecto! Has dado el primer paso en el Programming Puzzle Party. 

Ahora tienes acceso a todos los desafíos y estás listo para comenzar tu journey. Cada puzzle que resuelvas te dará puntos y te acercará a convertirte en un experto desarrollador Bitcoin.

¡La fiesta apenas comienza! 🚀`,
    narrator: 'Dr. Hash - Organizador del Programming Puzzle Party',
    characters: [
      {
        name: 'Dr. Hash',
        role: 'Organizador del Programming Puzzle Party',
        description: 'Un experto en Bitcoin que ha creado estos desafíos para ayudar a desarrolladores como tú a dominar el ecosistema.'
      },
      {
        name: '{{GITHUB_USERNAME}}',
        role: 'Participante del Programming Puzzle Party',
        description: 'Ese eres tú - un desarrollador valiente listo para conquistar los rompecabezas más desafiantes del mundo Bitcoin.'
      }
    ]
  },
  content: `
# 🎉 Programming Puzzle Party - Introducción

¡Bienvenido a la fiesta de programación más emocionante del ecosistema Bitcoin! Estás a punto de sumergirte en una aventura llena de rompecabezas desafiantes que te convertirán en un experto desarrollador.

## 🎯 Tu Misión de Bienvenida

Para comenzar oficialmente el Programming Puzzle Party, tu primera tarea es explorar el repositorio y elegir tu primer desafío.

### Pasos a seguir:

1. **📋 Acepta la asignación de GitHub Classroom** (botón verde abajo)
2. **🔍 Explora el repositorio** y lee cuidadosamente el README
3. **🧩 Elige tu primer rompecabezas:**
   - **Sudoku de Satoshi** - Para amantes de la lógica y los hashes
   - **Mochila del Minero** - Para optimizadores blockchain
   - **Enrutamiento Lightning** - Para navegantes de redes

4. **🚀 ¡Comienza tu aventura!**

## 🏆 ¿Qué encontrarás en el repositorio?

- **Instrucciones detalladas** para cada desafío
- **Criterios de evaluación** claros
- **Proceso de desarrollo** paso a paso
- **Soporte** via Discord

## 🎊 ¡La fiesta te espera!

Una vez que aceptes la asignación, tendrás acceso completo a todos los rompecabezas. Cada uno está diseñado para enseñarte aspectos fundamentales de Bitcoin y Lightning Network de manera divertida e interactiva.

**Dr. Hash está esperándote en el repositorio. ¡No lo hagas esperar!** 🎩
  `,
  initialCode: `const crypto = require('crypto')

function hashMessage(message) {
  // Create a SHA-256 hash object
  const hash = crypto.createHash('sha256')
  
  // Update the hash with the message
  hash.update(message)
  
  // Return the hash as lowercase hexadecimal
  return hash.digest('hex')
}

// Test your function
hashMessage("Hello Bitcoin")
`,
  validator: {
    language: 'javascript',
    testCases: [
      {
        name: 'Basic hash test',
        input: 'Hello Bitcoin',
        expectedOutput: 'b8b8f4fe7c4ee0f97f8e6c5a7a2b1c3e4f5d6e7c8b9a0b1c2d3e4f5a6b7c8d9e'
      },
      {
        name: 'Empty string test',
        input: '',
        expectedOutput: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      }
    ],
    validate: async (userCode: string, userOutput: unknown) => {
      try {
        // Create a safe evaluation context
        const crypto = await import('crypto')
        
        // Use the output from CodeEditor if available, otherwise try to execute the code
        let result = userOutput
        
        if (!result) {
          // Fallback: execute the code ourselves
          const mockRequire = (module: string) => {
            if (module === 'crypto') {
              return crypto.default || crypto
            }
            throw new Error(`Module ${module} not available`)
          }
          
          const func = new Function('require', userCode + '; return hashMessage("Hello Bitcoin")')
          result = func(mockRequire)
        }
        
        // Test the function exists and returns a string
        if (!result || typeof result !== 'string') {
          return {
            success: false,
            message: 'Function should return a string hash',
          }
        }

        // Test specific cases
        const testMessage = "Hello Bitcoin"
        const expectedHash = crypto.createHash('sha256').update(testMessage).digest('hex')
        
        if (result.toLowerCase() !== expectedHash.toLowerCase()) {
          return {
            success: false,
            message: `Expected hash for "${testMessage}" to be ${expectedHash}, but got ${result}`,
          }
        }

        return {
          success: true,
          message: 'Great! Your hash function works correctly!',
          passedTests: 1,
          totalTests: 1,
        }
      } catch (error) {
        return {
          success: false,
          message: `Error running your code: ${error}`,
          errors: [error?.toString() || 'Unknown error'],
        }
      }
    },
  },
  resources: [
    {
      title: 'Bitcoin SHA-256 Documentation',
      url: 'https://en.bitcoin.it/wiki/SHA-256',
      type: 'documentation'
    },
    {
      title: 'Node.js Crypto Module',
      url: 'https://nodejs.org/api/crypto.html',
      type: 'documentation'
    }
  ]
}
