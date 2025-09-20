export default async function handler(req, res) {
  console.log(`Test API called: ${req.method}`);
  
  if (req.method === 'GET') {
    res.status(200).json({ message: 'Test API working via GET' });
  } else if (req.method === 'POST') {
    console.log('POST body:', req.body);
    res.status(200).json({ message: 'Test API working via POST', body: req.body });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}