describe('endpoint ordering and status', () => {
  it('sorts the table by latency', () => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard.json' }).as('dashboard');
    cy.visit('/');
    cy.wait('@dashboard');
    cy.get('[data-testid=endpoint-row]').first().should('contain', 'Billing');
    cy.get('[data-testid=sort-latency]').click();
    cy.get('[data-testid=endpoint-row]').first().should('contain', 'Example');
    cy.get('[data-testid=sort-latency]').click();
    cy.get('[data-testid=endpoint-row]').first().should('contain', 'Billing');
  });

  it('shows a status change on the next poll', () => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard.json' }).as('dashboard');
    cy.visit('/');
    cy.wait('@dashboard');
    cy.contains('[data-testid=endpoint-row]', 'Billing')
      .find('[data-testid=status-badge]')
      .should('contain', 'Down');
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard-recovered.json' }).as('recovered');
    cy.wait('@recovered', { timeout: 10000 });
    cy.contains('[data-testid=endpoint-row]', 'Billing')
      .find('[data-testid=status-badge]')
      .should('contain', 'Up');
  });
});
