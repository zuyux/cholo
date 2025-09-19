
;; title: CHOLO DAO Tesorería
;; version: 2.0.0
;; summary: Tesorería multisig para una DAO en Stacks, con gestión dinámica de signers.
;; description: Contrato básico que almacena fondos y permite agregar, remover o reemplazar signers mediante propuestas y votos.

;; Dynamic signer set
(define-map signers {idx: uint} principal)
(define-data-var signer-count uint u5)
(define-data-var required-sigs uint u3)

;; Error Codes
(define-constant ERR_NOT_SIGNER (err u100))
(define-constant ERR_ALREADY_EXECUTED (err u101))
(define-constant ERR_ALREADY_APPROVED (err u103))
(define-constant ERR_NOT_FOUND (err u104))
(define-constant ERR_NOT_ENOUGH_APPROVALS (err u102))

(define-map proposals 
  {id: uint}
  {recipient: principal, amount: uint, approvals: uint, executed: bool, proposal-type: (string-ascii 16), new-signer: (optional principal), old-signer: (optional principal), token: (optional principal), description: (string-utf8 256), expiration: uint})
(define-map approvals
  {id: uint, signer: principal}
  bool)

(define-data-var next-id uint u0)

;; Inicialización de signers (solo en el primer deploy, reemplaza con tus signers)
(begin
  (map-set signers {idx: u0} 'SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD)
  (map-set signers {idx: u1} 'ST2YDY8H45J5HTN5M0H2XQH0JFCR4RWCA92QCZ7W6)
  (map-set signers {idx: u2} 'ST4ZB0M2ZKP1HRZPVAPE4X14K689X22N29YQQBG2)
  (map-set signers {idx: u3} 'ST9E6QNWPX7WVYJWTDAJ4WMXDNFHFSFKF91N68Z7)
  (map-set signers {idx: u4} 'SP555555555555555555555555555555555555555)
)

(define-public (deposit)
  (begin
    (stx-transfer? tx-amount tx-sender (as-contract tx-sender))
  )
)

;; Crear propuesta de gasto o gestión de signers
(define-public (create-proposal (recipient principal) (amount uint) (proposal-type (string-ascii 16)) (new-signer (optional principal)) (old-signer (optional principal)) (token (optional principal)) (description (string-utf8 256)) (expiration uint))
  (begin
    (asserts! (is-signer tx-sender) ERR_NOT_SIGNER)
    (let ((id (var-get next-id)))
      (map-set proposals {id: id}
        {recipient: recipient,
         amount: amount,
         approvals: u0,
         executed: false,
         proposal-type: proposal-type,
         new-signer: new-signer,
         old-signer: old-signer,
         token: token,
         description: description,
         expiration: expiration})
      (var-set next-id (+ id u1))
      (ok id)
    )
  )
)

;; Aprobar propuesta (cada signer solo puede aprobar una vez)
(define-public (approve-proposal (id uint))
  (let ((prop (map-get? proposals {id: id})))
    (match prop
      proposal
      (begin
        (asserts! (not (get executed proposal)) ERR_ALREADY_EXECUTED)
        (asserts! (is-signer tx-sender) ERR_NOT_SIGNER)
        (asserts! (is-none (map-get? approvals {id: id, signer: tx-sender})) ERR_ALREADY_APPROVED)
        (asserts! (> (get expiration proposal) block-height) (err u105))
        (map-set approvals {id: id, signer: tx-sender} true)
        (map-set proposals {id: id}
          {recipient: (get recipient proposal),
           amount: (get amount proposal),
           approvals: (+ (get approvals proposal) u1),
           executed: false,
           proposal-type: (get proposal-type proposal),
           new-signer: (get new-signer proposal),
           old-signer: (get old-signer proposal),
           token: (get token proposal),
           description: (get description proposal),
           expiration: (get expiration proposal)})
        (ok true))
  ERR_NOT_FOUND
    )
  )
)

;; Helper: check if principal is a signer
(define-read-only (is-signer (who principal))
  (let ((count (var-get signer-count)))
    (let loop ((i u0))
      (if (>= i count)
          false
          (if (is-eq who (default-to 'SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD (map-get? signers {idx: i})))
              true
              (loop (+ i u1))))))
)

;; Ejecutar propuesta si alcanza quorum
(define-public (execute-proposal (id uint))
  (let ((prop (map-get? proposals {id: id})))
    (match prop
      proposal
      (begin
        (asserts! (>= (get approvals proposal) (var-get required-sigs)) ERR_NOT_ENOUGH_APPROVALS)
        (asserts! (not (get executed proposal)) ERR_ALREADY_EXECUTED)
        (asserts! (> (get expiration proposal) block-height) (err u105))
        (map-set proposals {id: id}
          {recipient: (get recipient proposal),
           amount: (get amount proposal),
           approvals: (get approvals proposal),
           executed: true,
           proposal-type: (get proposal-type proposal),
           new-signer: (get new-signer proposal),
           old-signer: (get old-signer proposal),
           token: (get token proposal),
           description: (get description proposal),
           expiration: (get expiration proposal)})
    (if (is-eq (get proposal-type proposal) "transfer")
      (stx-transfer? (get amount proposal) (as-contract tx-sender) (get recipient proposal))
      (if (is-eq (get proposal-type proposal) "token-transfer")
        (token-transfer (get token proposal) (get amount proposal) (get recipient proposal))
        (if (is-eq (get proposal-type proposal) "add-signer")
          (add-signer (get new-signer proposal))
          (if (is-eq (get proposal-type proposal) "remove-signer")
            (remove-signer (get old-signer proposal))
            (if (is-eq (get proposal-type proposal) "replace-signer")
              (replace-signer (get old-signer proposal) (get new-signer proposal))
              (ok false)
            )
          )
        )
      )
    )
;; SIP-010 token transfer helper
(define-private (token-transfer (token-contract (optional principal)) (amount uint) (recipient principal))
  (match token-contract
    some-token
      (as-contract (contract-call? some-token transfer amount (as-contract tx-sender) recipient none))
    none (ok false)))

;; Agregar un signer
(define-private (add-signer (new (optional principal)))
  (match new
    some-new
      (let ((count (var-get signer-count)))
        (map-set signers {idx: count} some-new)
        (var-set signer-count (+ count u1))
        (ok true))SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD
    none (ok false)))

;; Remover un signer
(define-private (remove-signer (old (optional principal)))
  (match old
    some-old
      (let ((count (var-get signer-count)))
        (let loop ((i u0) (found false))
          (if (>= i count)
              (ok found)
              (let ((current (default-to 'SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD (map-get? signers {idx: i}))))
                (if (and (not found) (is-eq current some-old))
                    (begin
                      (map-delete signers {idx: i})
                      (var-set signer-count (- count u1))
                      (loop (+ i u1) true))
                    (loop (+ i u1) found))))))
    none (ok false)))

;; Reemplazar un signer
(define-private (replace-signer (old (optional principal)) (new (optional principal)))
  (match old
    some-old
      (match new
        some-new
          (let ((count (var-get signer-count)))
            (let loop ((i u0) (replaced false))
              (if (>= i count)
                  (ok replaced)
                  (let ((current (default-to 'SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD (map-get? signers {idx: i}))))
                    (if (and (not replaced) (is-eq current some-old))
                        (begin
                          (map-set signers {idx: i} some-new)
                          (ok true))
                        (loop (+ i u1) replaced))))))
        none (ok false)))
    none (ok false)))
      )
      ERR_NOT_FOUND
    )
  )
)
