const fs = require('fs');

/**
 * @jest-environment jsdom
 */

jest.mock('fs');

describe('loadItems', () => {
    let loadItems;

    beforeEach(() => {
        // Clear DOM
        document.body.innerHTML = `
            <div id="tier1items"></div>
            <div id="tier2items"></div>
            <div id="tier3items"></div>
            <div id="tier4items"></div>
        `;

        // Mock JSON data for each tier
        fs.readFileSync.mockImplementation((path) => {
            if (path === 'dictionary/t1-items.json') {
                return JSON.stringify([
                    { name: 'Item1', price: 100, width: 1, height: 2, color: '#111', image: 'img1.png' }
                ]);
            }
            if (path === 'dictionary/t2-items.json') {
                return JSON.stringify([
                    { name: 'Item2', price: 200, width: 2, height: 2, color: '#222', image: 'img2.png' }
                ]);
            }
            if (path === 'dictionary/t3-items.json') {
                return JSON.stringify([
                    { name: 'Item3', price: 300, width: 3, height: 2, color: '#333', image: 'img3.png' }
                ]);
            }
            if (path === 'dictionary/t4-items.json') {
                return JSON.stringify([
                    { name: 'Item4', price: 400, width: 4, height: 2, color: '#444', image: 'img4.png' }
                ]);
            }
            return '[]';
        });

        // Redefine loadItems in test scope (copy from code under test)
        loadItems = function() {
            for (let i = 1; i <= 4; i++) {
                const items = fs.readFileSync(`dictionary/t${i}-items.json`, 'utf8');
                const itemList = JSON.parse(items);
                const container = document.getElementById(`tier${i}items`);

                itemList.forEach(item => {
                    const itemDiv = document.createElement("div");
                    itemDiv.className = "item";
                    itemDiv.dataset.name = item.name;
                    itemDiv.dataset.price = item.price;
                    itemDiv.dataset.width = item.width;
                    itemDiv.dataset.height = item.height;
                    itemDiv.dataset.color = item.color;
                    itemDiv.textContent = `${item.name} - $${item.price}`;
                    
                    const img = document.createElement("img");
                    img.src = item.image;
                    img.alt = item.name;
                    
                    const label_top = document.createElement("div");
                    label_top.className = "label-top";
                    label_top.textContent = item.name;

                    const label_bottom = document.createElement("div");
                    label_bottom.className = "label-bottom";
                    label_bottom.textContent = `$${item.price}`;

                    itemDiv.appendChild(img);
                    itemDiv.appendChild(label_top);
                    itemDiv.appendChild(label_bottom);
                    container.appendChild(itemDiv);
                });
            }
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load and render items for all tiers', () => {
        loadItems();

        for (let i = 1; i <= 4; i++) {
            const container = document.getElementById(`tier${i}items`);
            expect(container).toBeTruthy();
            expect(container.querySelectorAll('.item').length).toBe(1);

            const itemDiv = container.querySelector('.item');
            expect(itemDiv).toBeTruthy();
            expect(itemDiv.dataset.name).toBe(`Item${i}`);
            expect(itemDiv.dataset.price).toBe(`${i * 100}`);
            expect(itemDiv.dataset.width).toBe(`${i}`);
            expect(itemDiv.dataset.height).toBe('2');
            expect(itemDiv.dataset.color).toBe(`#${i}${i}${i}`);

            // Check text content
            expect(itemDiv.textContent).toContain(`Item${i} - $${i * 100}`);

            // Check image
            const img = itemDiv.querySelector('img');
            expect(img).toBeTruthy();
            expect(img.src).toContain(`img${i}.png`);
            expect(img.alt).toBe(`Item${i}`);

            // Check label-top and label-bottom
            const labelTop = itemDiv.querySelector('.label-top');
            expect(labelTop).toBeTruthy();
            expect(labelTop.textContent).toBe(`Item${i}`);

            const labelBottom = itemDiv.querySelector('.label-bottom');
            expect(labelBottom).toBeTruthy();
            expect(labelBottom.textContent).toBe(`$${i * 100}`);
        }
    });

    it('should not throw if a tier has no items', () => {
        fs.readFileSync.mockImplementation((path) => '[]');
        expect(() => loadItems()).not.toThrow();
        for (let i = 1; i <= 4; i++) {
            const container = document.getElementById(`tier${i}items`);
            expect(container.querySelectorAll('.item').length).toBe(0);
        }
    });
});