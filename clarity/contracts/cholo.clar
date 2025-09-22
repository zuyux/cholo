;; title: CHOLO
;; version: 1.1.0
;; summary: $CHOLO es un token fungible con suministro fijo de 7,000,000,000 para financiar iniciativas DeSci y comunidad.
;; description: El token $CHOLO impulsa proyectos descentralizados de ciencia y tecnología (DeSci) y cultura comunitaria en Stacks. 
;; Sirve como unidad de valor estándar para transacciones, incentivos y gobernanza dentro del ecosistema CHOLO y la CHOLODAO. 
;; Tiene 8 decimales, total de 7,000,000,000 unidades. 
;; Cumple con el estándar SIP-010 sin dependencias externas.

(define-trait sip-010-trait
    (
        (get-balance (principal) (response uint uint))
        (get-total-supply () (response uint uint))
        (get-decimals () (response uint uint))
        (get-symbol () (response (string-ascii 12) uint))
        (get-name () (response (string-ascii 32) uint))
        (get-token-uri () (response (optional (string-ascii 256)) uint))
        (transfer (uint principal principal (optional (buff 34))) (response bool uint))
        (mint (uint principal) (response bool uint))
    )
)

(define-fungible-token CHOLO)

;; Error Constants
(define-constant ERR_OWNER_ONLY (err u100))
(define-constant ERR_NOT_TOKEN_OWNER (err u101))
(define-constant ERR_INVALID_AMOUNT (err u102))
(define-constant ERR_INVALID_RECIPIENT (err u103))
(define-constant ERR_MAX_SUPPLY_EXCEEDED (err u104))
(define-constant ERR_INVALID_OWNER (err u105))

;; Variables y Constantes
(define-data-var contract-owner principal tx-sender)
(define-data-var total-minted uint u0)
(define-constant TOKEN_URI (concat u"https://cholo.meme/ipfs/metadata" TOKEN_CID))
(define-constant TOKEN_NAME "CHOLO")
(define-constant TOKEN_SYMBOL "CHOLO")
(define-constant TOKEN_DECIMALS u8)
(define-constant MAX_SUPPLY u8000000000)
(define-constant BURN_ADDRESS 'SP000000000000000000002Q6VF78)

;; Funciones Read-Only
(define-read-only (get-balance (who principal))
  (ok (ft-get-balance CHOLO who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply CHOLO))
)

(define-read-only (get-name)
  (ok TOKEN_NAME)
)

(define-read-only (get-symbol)
  (ok TOKEN_SYMBOL)
)

(define-read-only (get-decimals)
  (ok TOKEN_DECIMALS)
)

(define-read-only (get-token-uri)
  (ok (some TOKEN_URI))
)

;; Funciones Públicas
(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_OWNER_ONLY)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (not (is-eq recipient BURN_ADDRESS)) ERR_INVALID_RECIPIENT)
    (let (
      (current-minted (var-get total-minted))
      (new-total (+ current-minted amount))
    )
      (asserts! (<= new-total MAX_SUPPLY) ERR_MAX_SUPPLY_EXCEEDED)
      (try! (ft-mint? CHOLO amount recipient))
      (var-set total-minted new-total)
      (ok true)
    )
  )
)

(define-public (transfer
  (amount uint)
  (sender principal)
  (recipient principal)
  (memo (optional (buff 34)))
)
  (begin
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (is-eq tx-sender sender) ERR_NOT_TOKEN_OWNER)
    (asserts! (not (is-eq recipient BURN_ADDRESS)) ERR_INVALID_RECIPIENT)
    (try! (ft-transfer? CHOLO amount sender recipient))
    (ok true)
  )
)

(define-public (set-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_OWNER_ONLY)
    (asserts! (not (is-eq new-owner BURN_ADDRESS)) ERR_INVALID_OWNER)
    (var-set contract-owner new-owner)
    (ok true)
  )
)

;; --- Public functions
(define-public (transfer-many
    (recipients (list 200 {
        amount: uint,
        sender: principal,
        to: principal,
        memo: (optional (buff 34))
    })))
  (fold transfer-many-iter recipients (ok u0))
)

(define-private (transfer-many-iter
    (individual-transfer {
        amount: uint,
        sender: principal,
        to: principal,
        memo: (optional (buff 34))
    })
    (result (response uint uint)))
  (match result
    index
      (begin
        (unwrap!
          (transfer
            (get amount individual-transfer)
            (get sender individual-transfer)
            (get to individual-transfer)
            (get memo individual-transfer))
          (err (+ u9000 index))) ;; ERR_TRANSFER_INDEX_PREFIX = u9000
        (ok (+ index u1))
      )
    err-index
      (err err-index)
  )
)

;; Inicialización
(begin
  (try! (ft-mint? CHOLO u1000000000 'SP000000000000000000002Q6VF78.cholo-dao)) ;; 1B to contract principal (replace with real contract principal)
  (try! (ft-mint? CHOLO u6000000000 tx-sender)) ;; 6B to tx-sender
  (var-set total-minted MAX_SUPPLY)
)

