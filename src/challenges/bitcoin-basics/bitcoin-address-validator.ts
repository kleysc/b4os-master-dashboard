import { Challenge } from '@/types/challenge'

export const bitcoinAddressValidator: Challenge = {
  metadata: {
    id: 'bitcoin-address-validator',
    title: 'Bitcoin Address Validator',
    description: 'Learn to validate Bitcoin addresses using Base58Check encoding',
    difficulty: 'intermediate',
    category: 'bitcoin-basics',
    estimatedTime: 30,
    points: 150,
    chapterNumber: 2,
    order: 2,
    type: 'inline' // This makes it an inline CodeEditor challenge
  },
  story: {
    chapterTitle: 'El Guardián de las Direcciones',
    introduction: `En el mundo de Bitcoin, las direcciones son como llaves que protegen los fondos. 🔐

Dr. Hash te ha encomendado una misión crucial: crear un validador de direcciones Bitcoin para proteger a los usuarios de enviar fondos a direcciones inválidas.`,
    context: `Las direcciones Bitcoin utilizan un sistema de codificación especial llamado Base58Check que:

• **Elimina caracteres confusos** (0, O, I, l) para evitar errores
• **Incluye un checksum** para detectar errores de escritura
• **Utiliza un prefijo** que identifica el tipo de dirección

Tu validador debe verificar que una dirección tenga el formato correcto y que su checksum sea válido.`,
    objective: `Implementa una función que valide direcciones Bitcoin Legacy (que empiezan con '1').

**Requisitos:**
1. La dirección debe empezar con '1'
2. Debe tener entre 26 y 35 caracteres
3. Solo debe contener caracteres Base58 válidos
4. El checksum debe ser correcto

**Tip:** Una dirección válida de ejemplo es: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'`,
    conclusion: `¡Excelente trabajo! Has creado un validador robusto de direcciones Bitcoin.

Este tipo de validación es fundamental en cualquier aplicación Bitcoin para prevenir pérdidas de fondos por direcciones mal escritas.

Dr. Hash está impresionado con tu precisión. ¡Sigues avanzando en tu journey Bitcoin! 🚀`,
    narrator: 'Dr. Hash - Guardián de la Seguridad Bitcoin',
    characters: [
      {
        name: 'Dr. Hash',
        role: 'Experto en Seguridad Bitcoin',
        description: 'Un especialista que enseña las mejores prácticas para manejar direcciones y transacciones Bitcoin de forma segura.'
      }
    ]
  },
  content: `
# 🔐 Bitcoin Address Validator

Las direcciones Bitcoin son fundamentales para la seguridad de la red. Tu misión es crear un validador que proteja a los usuarios de errores costosos.

## 🎯 Tu Desafío

Implementa la función \`validateBitcoinAddress\` que determine si una dirección Bitcoin Legacy es válida.

### Criterios de Validación:

1. **Prefijo correcto**: Debe empezar con '1'
2. **Longitud adecuada**: Entre 26 y 35 caracteres
3. **Caracteres válidos**: Solo Base58 (sin 0, O, I, l)
4. **Checksum válido**: Los últimos 4 bytes deben ser correctos

### Función Base58 proporcionada:

La función \`isValidBase58\` ya está implementada para verificar si una cadena contiene solo caracteres Base58 válidos.

## 💡 Consejos

- Las direcciones Bitcoin Legacy siempre empiezan con '1'
- El alfabeto Base58 es: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
- Una dirección de ejemplo válida: \`1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2\`

¡Buena suerte, desarrollador Bitcoin! 🚀
  `,
  initialCode: `// Bitcoin Base58 alphabet (without 0, O, I, l to avoid confusion)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

// Helper function to check if string contains only Base58 characters
function isValidBase58(str) {
  for (let i = 0; i < str.length; i++) {
    if (!BASE58_ALPHABET.includes(str[i])) {
      return false
    }
  }
  return true
}

function validateBitcoinAddress(address) {
  // TODO: Implement Bitcoin address validation

  // 1. Check if address starts with '1'
  if (!address.startsWith('1')) {
    return false
  }

  // 2. Check length (26-35 characters)
  if (address.length < 26 || address.length > 35) {
    return false
  }

  // 3. Check if all characters are valid Base58
  if (!isValidBase58(address)) {
    return false
  }

  // 4. For this exercise, we'll consider it valid if it passes the above tests
  // In a real implementation, you'd also verify the checksum
  return true
}

// Test your function
console.log(validateBitcoinAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2")) // should return true
console.log(validateBitcoinAddress("invalid-address")) // should return false
`,
  validator: {
    language: 'javascript',
    testCases: [
      {
        name: 'Valid address test',
        input: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        expectedOutput: true
      },
      {
        name: 'Invalid prefix test',
        input: '3BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        expectedOutput: false
      },
      {
        name: 'Too short test',
        input: '1BvBM',
        expectedOutput: false
      },
      {
        name: 'Invalid characters test',
        input: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaN0N2',
        expectedOutput: false
      }
    ],
    validate: async (userCode: string, userOutput: unknown) => {
      try {
        // Execute user code in a safe context
        const func = new Function(userCode + '; return validateBitcoinAddress')
        const validateBitcoinAddress = func()

        if (typeof validateBitcoinAddress !== 'function') {
          return {
            success: false,
            message: 'Function validateBitcoinAddress not found or is not a function',
          }
        }

        // Test cases
        const testCases = [
          { input: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', expected: true, name: 'Valid Legacy address' },
          { input: '3BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', expected: false, name: 'Invalid prefix (3)' },
          { input: '1BvBM', expected: false, name: 'Too short' },
          { input: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaN0N2', expected: false, name: 'Contains invalid character (0)' },
          { input: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2TooLong', expected: false, name: 'Too long' },
          { input: 'invalid-address', expected: false, name: 'Invalid format' },
        ]

        let passedTests = 0
        const errors: string[] = []

        for (const testCase of testCases) {
          try {
            const result = validateBitcoinAddress(testCase.input)
            if (result === testCase.expected) {
              passedTests++
            } else {
              errors.push(`${testCase.name}: Expected ${testCase.expected}, got ${result}`)
            }
          } catch (error) {
            errors.push(`${testCase.name}: Error executing function - ${error}`)
          }
        }

        const allPassed = passedTests === testCases.length

        return {
          success: allPassed,
          message: allPassed
            ? '🎉 Perfect! Your Bitcoin address validator works correctly!'
            : `${passedTests}/${testCases.length} tests passed. Check the errors below.`,
          passedTests,
          totalTests: testCases.length,
          errors: errors.length > 0 ? errors : undefined,
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
      title: 'Bitcoin Address Format',
      url: 'https://en.bitcoin.it/wiki/Address',
      type: 'documentation'
    },
    {
      title: 'Base58Check Encoding',
      url: 'https://en.bitcoin.it/wiki/Base58Check_encoding',
      type: 'documentation'
    },
    {
      title: 'Bitcoin Address Types Explained',
      url: 'https://bitcoin.org/en/glossary/address',
      type: 'documentation'
    }
  ]
}