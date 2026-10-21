describe('endpoint form', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'empty-dashboard.json' });
  });

  it('blocks submit until the URL is a public http address', () => {
    cy.visit('/endpoints/new');
    cy.get('[data-testid=save-endpoint]').click();
    cy.get('[data-testid=url-error]').should('contain', 'URL is required.');

    cy.get('[data-testid=endpoint-url]').type('http://127.0.0.1/admin');
    cy.get('[data-testid=save-endpoint]').click();
    cy.get('[data-testid=url-error]').should('contain', 'Private and local addresses are blocked.');
    cy.location('pathname').should('eq', '/endpoints/new');
  });
});
